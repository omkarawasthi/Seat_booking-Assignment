import { useState } from "react";

interface LayoutFormProps {
  onGenerate: (rows: number, cols: number) => void;
}

export function LayoutForm(props: LayoutFormProps) {
  const [rows, setRows] = useState<number>(5);
  const [cols, setCols] = useState<number>(5);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    props.onGenerate(rows, cols);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap gap-2 items-end bg-white p-3 rounded-md shadow"
    >
      <label className="flex flex-col text-sm text-gray-700">
        Rows
        <input
          type="number"
          min={3}
          max={20}
          value={rows}
          onChange={(e) => setRows(Number(e.target.value))}
          className="border rounded px-2 py-1"
        />
      </label>
      <label className="flex flex-col text-sm text-gray-700">
        Columns
        <input
          type="number"
          min={3}
          max={20}
          value={cols}
          onChange={(e) => setCols(Number(e.target.value))}
          className="border rounded px-2 py-1"
        />
      </label>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Generate
      </button>
    </form>
  );
}


