import { Server } from "socket.io";
import {
  saveLayout,
  getLayout,
  getBookedSeats,
  getActiveHolds,
  createHold,
  releaseHold,
  bookSeats as bookSeatsInDb
} from "../repository/seatRepository";

export type SeatStateForUser = "available" | "heldByMe" | "heldByOther" | "booked";

export interface SeatView {
  seatId: string;
  row: number;
  col: number;
  status: SeatStateForUser;
  remainingHoldMs: number;
}

export interface SeatBroadcast {
  seatId: string;
  row: number;
  col: number;
  status: "available" | "held" | "booked";
  holdUserId?: string;
  holdUntil?: Date;
}

function generateSeatId(row: number, col: number): string {
  const rowLetter = String.fromCharCode(64 + row);
  return `${rowLetter}${col}`;
}

function parseSeatId(seatId: string): { row: number; col: number } | null {
  const match = seatId.match(/^([A-Z])(\d+)$/);
  if (!match) return null;
  const row = match[1].charCodeAt(0) - 64;
  const col = parseInt(match[2], 10);
  return { row, col };
}

function generateAllSeats(rows: number, cols: number): Array<{ seatId: string; row: number; col: number }> {
  const seats: Array<{ seatId: string; row: number; col: number }> = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      seats.push({
        seatId: generateSeatId(r, c),
        row: r,
        col: c
      });
    }
  }
  return seats;
}

function seatsAreContiguous(seatIds: string[]): boolean {
  if (seatIds.length === 0) return true;

  const seats = seatIds.map(id => parseSeatId(id)).filter(s => s !== null) as Array<{ row: number; col: number }>;
  if (seats.length !== seatIds.length) return false;

  const firstRow = seats[0].row;
  if (seats.some(s => s.row !== firstRow)) return false;

  const sorted = [...seats].sort((a, b) => a.col - b.col);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].col - sorted[i - 1].col !== 1) return false;
  }
  return true;
}

export function createSeatService(io: Server) {
  return {
    async generateLayout(rows: number, cols: number) {
      await saveLayout(rows, cols);
      // Clear all holds and bookings when generating new layout
      const { SeatHoldModel } = await import("../models/SeatHold");
      const { BookingModel } = await import("../models/Booking");
      await SeatHoldModel.deleteMany({}).exec();
      await BookingModel.deleteMany({}).exec();
      await this.sendFullSync();
    },

    async getSeatsForUser(userId: string): Promise<SeatView[]> {
      const layout = await getLayout();
      if (!layout) {
        return [];
      }

      const bookedSeats = await getBookedSeats();
      const holds = await getActiveHolds();
      const allSeats = generateAllSeats(layout.rows, layout.cols);
      const now = Date.now();

      return allSeats.map(seat => {
        let status: SeatStateForUser = "available";
        let remainingHoldMs = 0;

        if (bookedSeats.includes(seat.seatId)) {
          status = "booked";
        } else {
          const hold = holds.find(h => h.seatId === seat.seatId);
          if (hold) {
            const holdUntilTime = hold.holdUntil.getTime();
            if (holdUntilTime > now) {
              if (hold.userId === userId) {
                status = "heldByMe";
              } else {
                status = "heldByOther";
              }
              remainingHoldMs = holdUntilTime - now;
            }
          }
        }

        return {
          seatId: seat.seatId,
          row: seat.row,
          col: seat.col,
          status,
          remainingHoldMs
        };
      });
    },

    async holdSeat(userId: string, seatId: string): Promise<SeatView> {
      const holdSeconds = Number(process.env.HOLD_SECONDS) || 60;
      const holdUntil = new Date(Date.now() + holdSeconds * 1000);
      
      const success = await createHold(seatId, userId, holdUntil);
      if (!success) {
        throw new Error("Seat is not available");
      }

      const layout = await getLayout();
      if (!layout) {
        throw new Error("Layout not found");
      }

      const parsed = parseSeatId(seatId);
      if (!parsed) {
        throw new Error("Invalid seat ID");
      }

      io.emit("seatUpdate", {
        seatId,
        row: parsed.row,
        col: parsed.col,
        status: "held",
        holdUserId: userId,
        holdUntil
      });

      const seats = await this.getSeatsForUser(userId);
      const seat = seats.find(s => s.seatId === seatId);
      if (!seat) {
        throw new Error("Seat not found");
      }
      return seat;
    },

    async releaseSeat(userId: string, seatId: string): Promise<SeatView> {
      const success = await releaseHold(seatId, userId);
      if (!success) {
        throw new Error("No held seat found");
      }

      const layout = await getLayout();
      if (!layout) {
        throw new Error("Layout not found");
      }

      const parsed = parseSeatId(seatId);
      if (!parsed) {
        throw new Error("Invalid seat ID");
      }

      io.emit("seatUpdate", {
        seatId,
        row: parsed.row,
        col: parsed.col,
        status: "available"
      });

      const seats = await this.getSeatsForUser(userId);
      const seat = seats.find(s => s.seatId === seatId);
      if (!seat) {
        throw new Error("Seat not found");
      }
      return seat;
    },

    async bookSeats(userId: string, seatIds: string[]) {
      if (!seatsAreContiguous(seatIds)) {
        throw new Error("Seats must be contiguous");
      }

      const success = await bookSeatsInDb(seatIds, userId);
      if (!success) {
        throw new Error("Some seats were already taken");
      }

      await this.sendFullSync();
    },

    async sendFullSync() {
      const layout = await getLayout();
      if (!layout) {
        return;
      }

      const bookedSeats = await getBookedSeats();
      const holds = await getActiveHolds();
      const allSeats = generateAllSeats(layout.rows, layout.cols);
      const now = new Date();

      const payload: SeatBroadcast[] = allSeats.map(seat => {
        if (bookedSeats.includes(seat.seatId)) {
          return {
            seatId: seat.seatId,
            row: seat.row,
            col: seat.col,
            status: "booked"
          };
        }

        const hold = holds.find(h => h.seatId === seat.seatId && h.holdUntil > now);
        if (hold) {
          return {
            seatId: seat.seatId,
            row: seat.row,
            col: seat.col,
            status: "held",
            holdUserId: hold.userId,
            holdUntil: hold.holdUntil
          };
        }

        return {
          seatId: seat.seatId,
          row: seat.row,
          col: seat.col,
          status: "available"
        };
      });

      io.emit("seatsSync", payload);
    }
  };
}
