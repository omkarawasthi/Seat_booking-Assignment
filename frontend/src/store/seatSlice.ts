import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  bookSeatsApi,
  createLayout,
  fetchSeats,
  holdSeatApi,
  releaseSeatApi
} from "../api";
import { Seat, SeatBroadcast } from "../types";

export interface SeatStateStore {
  userId: string;
  seats: Seat[];
  rows: number;
  cols: number;
  loading: boolean;
  error?: string;
}

const initialState: SeatStateStore = {
  userId: "",
  seats: [],
  rows: 0,
  cols: 0,
  loading: false,
  error: undefined
};

function computeLayout(seats: Seat[]): { rows: number; cols: number } {
  let maxRow = 0;
  let maxCol = 0;
  seats.forEach((seat) => {
    if (seat.row > maxRow) {
      maxRow = seat.row;
    }
    if (seat.col > maxCol) {
      maxCol = seat.col;
    }
  });
  return { rows: maxRow, cols: maxCol };
}

function mapBroadcastToSeat(
  broadcast: SeatBroadcast,
  current: Seat | undefined,
  userId: string
): Seat {
  const now = Date.now();
  let status: Seat["status"] = "available";
  let remainingHoldMs = 0;

  // Check if seat is booked
  if (broadcast.status === "booked") {
    status = "booked";
  } else if (broadcast.status === "held" && broadcast.holdUntil) {
    // Check if hold is still valid
    const holdUntilTime = new Date(broadcast.holdUntil).getTime();
    if (holdUntilTime > now) {
      // Hold is still active
      if (broadcast.holdUserId === userId) {
        status = "heldByMe";
      } else if (broadcast.holdUserId) {
        status = "heldByOther";
      }
      remainingHoldMs = holdUntilTime - now;
    } else {
      // Hold expired
      status = "available";
    }
  }

  // Get row and col from broadcast or current seat
  const row = broadcast.row || (current ? current.row : 0);
  const col = broadcast.col || (current ? current.col : 0);

  return {
    seatId: broadcast.seatId,
    row: row,
    col: col,
    status: status,
    remainingHoldMs: remainingHoldMs
  };
}

export const loadSeats = createAsyncThunk<
  Seat[],
  { userId: string },
  { rejectValue: string }
>("seats/load", async (args, thunkApi) => {
  try {
    return await fetchSeats(args.userId);
  } catch (error) {
    return thunkApi.rejectWithValue("Failed to fetch seats");
  }
});

export const createLayoutAndLoad = createAsyncThunk<
  Seat[],
  { userId: string; rows: number; cols: number },
  { rejectValue: string }
>("seats/createLayoutAndLoad", async (args, thunkApi) => {
  try {
    await createLayout(args.rows, args.cols);
    return await fetchSeats(args.userId);
  } catch (error) {
    return thunkApi.rejectWithValue("Layout creation failed");
  }
});

export const holdSeatForUser = createAsyncThunk<
  Seat,
  { seatId: string },
  { state: { seats: SeatStateStore }; rejectValue: string }
>("seats/holdSeat", async (args, thunkApi) => {
  const state = thunkApi.getState().seats;
  if (!state.userId) {
    return thunkApi.rejectWithValue("Missing user id");
  }
  try {
    return await holdSeatApi(args.seatId, state.userId);
  } catch (error) {
    return thunkApi.rejectWithValue("Seat already taken");
  }
});

export const releaseSeatForUser = createAsyncThunk<
  Seat,
  { seatId: string },
  { state: { seats: SeatStateStore }; rejectValue: string }
>("seats/releaseSeat", async (args, thunkApi) => {
  const state = thunkApi.getState().seats;
  if (!state.userId) {
    return thunkApi.rejectWithValue("Missing user id");
  }
  try {
    return await releaseSeatApi(args.seatId, state.userId);
  } catch (error) {
    return thunkApi.rejectWithValue("Release failed");
  }
});

export const bookHeldSeats = createAsyncThunk<
  void,
  { seatIds: string[] },
  { state: { seats: SeatStateStore }; rejectValue: string }
>("seats/bookHeldSeats", async (args, thunkApi) => {
  const state = thunkApi.getState().seats;
  if (!state.userId) {
    return thunkApi.rejectWithValue("Missing user id");
  }
  try {
    await bookSeatsApi(args.seatIds, state.userId);
  } catch (error) {
    return thunkApi.rejectWithValue("Booking failed");
  }
});

const seatSlice = createSlice({
  name: "seats",
  initialState,
  reducers: {
    setUserId(state, action: PayloadAction<string>) {
      state.userId = action.payload;
    },
    applyBroadcast(state, action: PayloadAction<SeatBroadcast>) {
      const broadcast = action.payload;
      const currentSeat = state.seats.find(
        (seat) => seat.seatId === broadcast.seatId
      );
      const updatedSeat = mapBroadcastToSeat(broadcast, currentSeat, state.userId);
      
      // Replace the seat in the array
      const otherSeats = state.seats.filter(
        (seat) => seat.seatId !== broadcast.seatId
      );
      state.seats = [...otherSeats, updatedSeat];
      
      // Sort seats by row and column
      state.seats.sort((a, b) => {
        if (a.row === b.row) {
          return a.col - b.col;
        }
        return a.row - b.row;
      });
      
      // Update layout dimensions
      const layout = computeLayout(state.seats);
      state.rows = layout.rows;
      state.cols = layout.cols;
    },
    replaceFromSync(state, action: PayloadAction<SeatBroadcast[]>) {
      const broadcasts = action.payload;
      const newSeats: Seat[] = [];
      
      // Convert each broadcast to a seat
      for (let i = 0; i < broadcasts.length; i++) {
        const broadcast = broadcasts[i];
        const currentSeat = state.seats.find(
          (seat) => seat.seatId === broadcast.seatId
        );
        const seat = mapBroadcastToSeat(broadcast, currentSeat, state.userId);
        newSeats.push(seat);
      }
      
      // Sort seats by row and column
      newSeats.sort((a, b) => {
        if (a.row === b.row) {
          return a.col - b.col;
        }
        return a.row - b.row;
      });
      
      state.seats = newSeats;
      
      // Update layout dimensions
      const layout = computeLayout(state.seats);
      state.rows = layout.rows;
      state.cols = layout.cols;
    },
    tickTimers(state) {
      state.seats = state.seats.map((seat) => {
        if (seat.remainingHoldMs <= 0) {
          return { ...seat, remainingHoldMs: 0 };
        }
        return {
          ...seat,
          remainingHoldMs: Math.max(0, seat.remainingHoldMs - 1000)
        };
      });
    },
    clearError(state) {
      state.error = undefined;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSeats.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadSeats.fulfilled, (state, action) => {
        state.loading = false;
        state.seats = action.payload;
        const layout = computeLayout(action.payload);
        state.rows = layout.rows;
        state.cols = layout.cols;
      })
      .addCase(loadSeats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createLayoutAndLoad.fulfilled, (state, action) => {
        state.seats = action.payload;
        const layout = computeLayout(action.payload);
        state.rows = layout.rows;
        state.cols = layout.cols;
        state.error = undefined;
      })
      .addCase(createLayoutAndLoad.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(holdSeatForUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(releaseSeatForUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(bookHeldSeats.rejected, (state, action) => {
        state.error = action.payload;
      });
  }
});

export const { setUserId, applyBroadcast, replaceFromSync, tickTimers, clearError } =
  seatSlice.actions;

export default seatSlice.reducer;


