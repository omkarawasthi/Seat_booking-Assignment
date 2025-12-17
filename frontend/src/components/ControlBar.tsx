interface ControlBarProps {
  onBook: () => void;
  canBook: boolean;
  selectedCount: number;
  error?: string;
}

export function ControlBar(props: ControlBarProps) {
  return (
    <div className="flex items-center gap-3 bg-white p-3 rounded-md shadow">
      <button
        type="button"
        onClick={props.onBook}
        disabled={!props.canBook}
        className={`px-4 py-2 rounded text-white ${
          props.canBook
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        Book ({props.selectedCount})
      </button>
      <div className="text-xs text-gray-700 flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded bg-green-400" />
        Available
        <span className="inline-block w-3 h-3 rounded bg-amber-400" />
        Selected
        <span className="inline-block w-3 h-3 rounded bg-gray-400" />
        Locked
        <span className="inline-block w-3 h-3 rounded bg-red-500" />
        Booked
      </div>
      {props.error && (
        <div className="text-xs text-red-600">{props.error}</div>
      )}
    </div>
  );
}


