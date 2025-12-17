import { Schema, model, Document } from "mongoose";

export interface SeatHoldDoc extends Document {
  seatId: string;
  userId: string;
  holdUntil: Date;
}

const seatHoldSchema = new Schema<SeatHoldDoc>({
  seatId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  holdUntil: { type: Date, required: true }
});

// Create TTL index for automatic expiration
seatHoldSchema.index({ holdUntil: 1 }, { expireAfterSeconds: 0 });

export const SeatHoldModel = model<SeatHoldDoc>("SeatHold", seatHoldSchema);

