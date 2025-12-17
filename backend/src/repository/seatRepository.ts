import { LayoutModel } from "../models/Layout";
import { BookingModel } from "../models/Booking";
import { SeatHoldModel } from "../models/SeatHold";

export async function saveLayout(rows: number, cols: number): Promise<void> {
  await LayoutModel.deleteMany({}).exec();
  await LayoutModel.create({ rows, cols });
}

export async function getLayout(): Promise<{ rows: number; cols: number } | null> {
  const layout = await LayoutModel.findOne({}).exec();
  return layout ? { rows: layout.rows, cols: layout.cols } : null;
}

export async function getBookedSeats(): Promise<string[]> {
  const bookings = await BookingModel.find({})
    .select("seatIds -_id")
    .lean()
    .exec();
  const bookedSeats: string[] = [];
  bookings.forEach((booking) => {
    bookedSeats.push(...booking.seatIds);
  });
  return bookedSeats;
}

export async function getActiveHolds(): Promise<Array<{ seatId: string; userId: string; holdUntil: Date }>> {
  const now = new Date();
  const holds = await SeatHoldModel.find({ holdUntil: { $gt: now } }).exec();
  return holds.map(h => ({
    seatId: h.seatId,
    userId: h.userId,
    holdUntil: h.holdUntil
  }));
}

export async function createHold(seatId: string, userId: string, holdUntil: Date): Promise<boolean> {
  const session = await SeatHoldModel.startSession();
  let success = false;
  try {
    await session.withTransaction(async () => {
      const now = new Date();

      // Fail if seat is already booked (checked inside the transaction)
      const bookingWithSeat = await BookingModel.findOne({
        seatIds: seatId
      })
        .session(session)
        .exec();

      if (bookingWithSeat) {
        success = false;
        return;
      }

      // Remove any expired holds for this seat
      await SeatHoldModel.deleteMany({
        seatId,
        holdUntil: { $lte: now }
      })
        .session(session)
        .exec();

      // Check if there is still an active hold
      const existingHold = await SeatHoldModel.findOne({
        seatId,
        holdUntil: { $gt: now }
      })
        .session(session)
        .exec();

      if (existingHold) {
        success = false;
        return;
      }

      // Create new hold atomically within the transaction
      await SeatHoldModel.create(
        [
          {
            seatId,
            userId,
            holdUntil
          }
        ],
        { session }
      );

      success = true;
    });
  } catch (error) {
    // Log and rethrow so upper layers can decide how to respond
    // eslint-disable-next-line no-console
    console.error("createHold transaction failed", { seatId, userId, error });
    throw error;
  } finally {
    session.endSession();
  }

  return success;
}

export async function releaseHold(seatId: string, userId: string): Promise<boolean> {
  const result = await SeatHoldModel.deleteOne({
    seatId,
    userId
  }).exec();
  return result.deletedCount > 0;
}

export async function bookSeats(seatIds: string[], userId: string): Promise<boolean> {
  const session = await BookingModel.startSession();
  let success = false;

  try {
    await session.withTransaction(async () => {
      const now = new Date();

      // Verify all seats are held by this user and not expired
      const holds = await SeatHoldModel.find({
        seatId: { $in: seatIds },
        userId,
        holdUntil: { $gt: now }
      })
        .session(session)
        .exec();

      if (holds.length !== seatIds.length) {
        success = false;
        return;
      }

      // Check if any seat is already booked (by any user) inside this transaction
      const existingBooking = await BookingModel.findOne({
        seatIds: { $in: seatIds }
      })
        .session(session)
        .exec();

      if (existingBooking) {
        success = false;
        return;
      }

      // Create or update booking for this user atomically
      await BookingModel.findOneAndUpdate(
        { userId },
        {
          // add new seatIds, avoid duplicates
          $addToSet: { seatIds: { $each: seatIds } },
          // set bookedAt when first created
          $setOnInsert: { bookedAt: now }
        },
        { upsert: true, session }
      ).exec();

      // Remove holds for these seats for this user
      await SeatHoldModel.deleteMany({
        seatId: { $in: seatIds },
        userId
      })
        .session(session)
        .exec();

      success = true;
    });
  } catch (error) {
    // Log and rethrow so upper layers can decide how to respond
    // eslint-disable-next-line no-console
    console.error("bookSeats transaction failed", { seatIds, userId, error });
    throw error;
  } finally {
    session.endSession();
  }

  return success;
}
