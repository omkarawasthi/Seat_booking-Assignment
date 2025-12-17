import { Seat } from "../types";

interface SeatTileProps {
  seat: Seat;
  onClick: (seat: Seat) => void;
}

export function SeatTile(props: SeatTileProps) {
  const { seat } = props;

  let colorClass = "bg-green-400";
  if (seat.status === "heldByMe") {
    colorClass = "bg-amber-400";
  }
  if (seat.status === "heldByOther") {
    colorClass = "bg-gray-400";
  }
  if (seat.status === "booked") {
    colorClass = "bg-red-500";
  }

  const disabled =
    seat.status === "heldByOther" || seat.status === "booked";

  function handleClick() {
    if (!disabled) {
      props.onClick(seat);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`w-12 h-12 rounded text-xs font-semibold text-white ${colorClass}`}
    >
      {seat.seatId}
    </button>
  );
}


