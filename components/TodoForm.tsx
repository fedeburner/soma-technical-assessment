"use client";
import { useState } from "react";

type Props = {
  onAdd: (title: string, dueDate: string | null) => Promise<void>;
};

export default function TodoForm({ onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || loading) return;
    setLoading(true);
    try {
      await onAdd(title.trim(), dueDate || null);
      setTitle("");
      setDueDate("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-grow p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-gray-700 shadow-sm"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={loading}
        />
        <input
          type="date"
          className="p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-gray-700 shadow-sm bg-white"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={loading}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim()}
          className="bg-white text-orange-600 font-semibold px-6 py-3 rounded-lg hover:bg-orange-50 transition duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
        >
          {loading ? (
            <span className="inline-block w-5 h-5 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
          ) : (
            "Add"
          )}
        </button>
      </div>
    </div>
  );
}
