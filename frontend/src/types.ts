export type SeatState = "available" | "heldByMe" | "heldByOther" | "booked";

export interface Seat {
  seatId: string;
  row: number;
  col: number;
  status: SeatState;
  remainingHoldMs: number;
}

export interface SeatBroadcast {
  seatId: string;
  row: number;
  col: number;
  status: "available" | "held" | "booked";
  holdUserId?: string;
  holdUntil?: string;
}


