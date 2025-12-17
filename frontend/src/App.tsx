import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { LayoutForm } from "./components/LayoutForm";
import { SeatGrid } from "./components/SeatGrid";
import { ControlBar } from "./components/ControlBar";
import { TimerBar } from "./components/TimerBar";
import { Toast } from "./components/Toast";
import {
  applyBroadcast,
  bookHeldSeats,
  clearError,
  createLayoutAndLoad,
  holdSeatForUser,
  loadSeats,
  releaseSeatForUser,
  replaceFromSync,
  setUserId,
  tickTimers
} from "./store/seatSlice";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { Seat } from "./types";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

function makeUserId(): string {
  const key = "seat-user-id";
  const stored = localStorage.getItem(key);
  if (stored) {
    return stored;
  }
  const newId = `user-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(key, newId);
  return newId;
}

function areSeatsContiguous(seats: Seat[]): boolean {
  if (seats.length === 0) {
    return true;
  }
  const row = seats[0].row;
  if (seats.some((seat) => seat.row !== row)) {
    return false;
  }
  const sorted = [...seats].sort((a, b) => a.col - b.col);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].col - sorted[i - 1].col !== 1) {
      return false;
    }
  }
  return true;
}

export function App() {
  const dispatch = useAppDispatch();
  const seatsState = useAppSelector((state) => state.seats);
  const [toast, setToast] = useState<string | undefined>();

  useEffect(() => {
    const id = makeUserId();
    dispatch(setUserId(id));
  }, [dispatch]);

  useEffect(() => {
    if (!seatsState.userId) {
      return;
    }

    dispatch(loadSeats({ userId: seatsState.userId }));

    const socket = io(socketUrl);
    socket.on("seatUpdate", (data) => {
      dispatch(applyBroadcast(data));
    });
    socket.on("seatsSync", (data) => {
      dispatch(replaceFromSync(data));
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, seatsState.userId]);

  useEffect(() => {
    const timerId = setInterval(() => {
      dispatch(tickTimers());
    }, 1000);
    return () => {
      clearInterval(timerId);
    };
  }, [dispatch]);

  useEffect(() => {
    if (seatsState.error) {
      setToast(seatsState.error);
    }
  }, [seatsState.error]);

  const myHeldSeats = useMemo(
    () => seatsState.seats.filter((seat) => seat.status === "heldByMe"),
    [seatsState.seats]
  );

  const earliestHoldMs = myHeldSeats.length
    ? Math.min(...myHeldSeats.map((seat) => seat.remainingHoldMs))
    : 0;

  const contiguousOk = areSeatsContiguous(myHeldSeats);

  function handleSeatClick(seat: Seat) {
    if (!seatsState.userId) {
      return;
    }
    if (seat.status === "heldByMe") {
      dispatch(releaseSeatForUser({ seatId: seat.seatId }));
      return;
    }
    const nextSeats = [...myHeldSeats, seat];
    if (!areSeatsContiguous(nextSeats)) {
      setToast("Seats must be in the same row with no gaps.");
      return;
    }
    dispatch(holdSeatForUser({ seatId: seat.seatId }));
  }

  function handleGenerate(rows: number, cols: number) {
    if (!seatsState.userId) {
      return;
    }
    dispatch(
      createLayoutAndLoad({ userId: seatsState.userId, rows, cols })
    );
  }

  function handleBook() {
    if (!contiguousOk) {
      setToast("Cannot book with gaps. Pick seats side by side.");
      return;
    }
    const ids = myHeldSeats.map((seat) => seat.seatId);
    if (ids.length === 0) {
      setToast("Select at least one seat.");
      return;
    }
    dispatch(bookHeldSeats({ seatIds: ids }));
  }

  function closeToast() {
    setToast(undefined);
    dispatch(clearError());
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Seat Booking System</h1>
        <LayoutForm onGenerate={handleGenerate} />
        <ControlBar
          onBook={handleBook}
          canBook={contiguousOk && myHeldSeats.length > 0}
          selectedCount={myHeldSeats.length}
          error={contiguousOk ? undefined : "No gaps allowed."}
        />
        <TimerBar secondsLeft={Math.round(earliestHoldMs / 1000)} />
        <SeatGrid
          rows={seatsState.rows}
          cols={seatsState.cols}
          seats={seatsState.seats}
          onSeatClick={handleSeatClick}
        />
      </div>
      {toast && <Toast message={toast} onClose={closeToast} />}
    </div>
  );
}


