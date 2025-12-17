interface TimerBarProps {
  secondsLeft: number;
}

export function TimerBar(props: TimerBarProps) {
  if (props.secondsLeft <= 0) {
    return null;
  }

  return (
    <div className="bg-amber-100 border border-amber-300 text-amber-800 px-3 py-2 rounded text-sm">
      Seats held. Time left: {props.secondsLeft}s
    </div>
  );
}


