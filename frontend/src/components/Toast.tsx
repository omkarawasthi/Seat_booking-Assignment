interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast(props: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 text-sm">
      <span>{props.message}</span>
      <button
        type="button"
        onClick={props.onClose}
        className="text-xs underline"
      >
        Close
      </button>
    </div>
  );
}


