import { Seat } from "../types";
import { SeatTile } from "./SeatTile";

interface SeatGridProps {
  rows: number;
  cols: number;
  seats: Seat[];
  onSeatClick: (seat: Seat) => void;
}

export function SeatGrid(props: SeatGridProps) {
  if (props.rows === 0 || props.cols === 0) {
    return (
      <div className="text-sm text-gray-600">
        Generate a layout to start.
      </div>
    );
  }

  const seatMap: Record<string, Seat> = {};
  props.seats.forEach((seat) => {
    const key = `${seat.row}-${seat.col}`;
    seatMap[key] = seat;
  });

  const rows: JSX.Element[] = [];

  for (let r = 1; r <= props.rows; r += 1) {
    const cols: JSX.Element[] = [];
    for (let c = 1; c <= props.cols; c += 1) {
      const key = `${r}-${c}`;
      const seat = seatMap[key];
      if (seat) {
        cols.push(
          <SeatTile key={seat.seatId} seat={seat} onClick={props.onSeatClick} />
        );
      } else {
        cols.push(
          <div
            key={key}
            className="w-12 h-12 rounded border border-dashed border-gray-300"
          />
        );
      }
    }
    rows.push(
      <div key={r} className="flex gap-2">
        {cols}
      </div>
    );
  }

  return <div className="flex flex-col gap-2">{rows}</div>;
}


