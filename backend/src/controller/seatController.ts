import { Request, Response } from "express";
import { z } from "zod";
import { createSeatService } from "../service/seatService";
import { layoutSchema } from "../validation/layoutValidation";
import {
  bookSeatsSchema,
  holdSeatSchema,
  releaseSeatSchema
} from "../validation/seatValidation";

export function createSeatController(service: ReturnType<typeof createSeatService>) {
  return {
    generateLayout: async (req: Request, res: Response) => {
      try {
        const result = layoutSchema.safeParse(req.body);
        if (!result.success) {
          res.status(400).json({ error: "Invalid input" });
          return;
        }

        const rows = result.data.rows;
        const cols = result.data.cols;

        await service.generateLayout(rows, cols);
        res.json({ ok: true });
      } catch (error) {
        console.log("Error generating layout:", error);
        res.status(500).json({ error: "Failed to generate layout" });
      }
    },
    getSeats: async (req: Request, res: Response) => {
      try {
        const userId = req.query.userId as string;
        if (!userId || userId.length === 0) {
          res.status(400).json({ error: "userId is required" });
          return;
        }

        const seats = await service.getSeatsForUser(userId);
        res.json({ seats });
      } catch (error) {
        console.log("Error getting seats:", error);
        res.status(500).json({ error: "Failed to fetch seats" });
      }
    },
    holdSeat: async (req: Request, res: Response) => {
      try {
        const result = holdSeatSchema.safeParse(req.body);
        if (!result.success) {
          res.status(400).json({ error: "Invalid input" });
          return;
        }

        const seatId = result.data.seatId;
        const userId = result.data.userId;

        const seat = await service.holdSeat(userId, seatId);
        res.json({ seat });
      } catch (error) {
        console.log("Error holding seat:", error);
        res.status(409).json({ error: "Seat not available" });
      }
    },
    releaseSeat: async (req: Request, res: Response) => {
      try {
        const result = releaseSeatSchema.safeParse(req.body);
        if (!result.success) {
          res.status(400).json({ error: "Invalid input" });
          return;
        }

        const seatId = result.data.seatId;
        const userId = result.data.userId;

        const seat = await service.releaseSeat(userId, seatId);
        res.json({ seat });
      } catch (error) {
        console.log("Error releasing seat:", error);
        res.status(404).json({ error: "Hold not found" });
      }
    },
    bookSeats: async (req: Request, res: Response) => {
      try {
        const result = bookSeatsSchema.safeParse(req.body);
        if (!result.success) {
          res.status(400).json({ error: "Invalid input" });
          return;
        }

        const seatIds = result.data.seatIds;
        const userId = result.data.userId;

        await service.bookSeats(userId, seatIds);
        res.json({ ok: true });
      } catch (error) {
        console.log("Error booking seats:", error);
        res.status(409).json({ error: "Booking failed" });
      }
    }
  };
}


