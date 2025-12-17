import { z } from "zod";

export const holdSeatSchema = z.object({
  seatId: z.string().min(1),
  userId: z.string().min(1)
});

export const releaseSeatSchema = z.object({
  seatId: z.string().min(1),
  userId: z.string().min(1)
});

export const bookSeatsSchema = z.object({
  seatIds: z.array(z.string().min(1)).min(1),
  userId: z.string().min(1)
});


