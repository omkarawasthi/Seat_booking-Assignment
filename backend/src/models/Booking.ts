import { Schema, model, Document } from "mongoose";

export interface BookingDoc extends Document {
  userId: string;
  seatIds: string[];
  bookedAt: Date;
}

const bookingSchema = new Schema<BookingDoc>({
  userId: { type: String, required: true },
  seatIds: [{ type: String, required: true }],
  bookedAt: { type: Date, default: Date.now }
});

// Indexes to speed up lookups by user and by seat
bookingSchema.index({ userId: 1 });
bookingSchema.index({ seatIds: 1 });

export const BookingModel = model<BookingDoc>("Booking", bookingSchema);

