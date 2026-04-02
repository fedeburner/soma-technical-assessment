"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { TodoWithCPM } from "@/lib/types";

type Props = {
  todo: TodoWithCPM;
  allTodos: TodoWithCPM[];
  onDelete: (id: number) => void;
  onAddDep: (todoId: number, depId: number) => Promise<string | null>;
  onRemoveDep: (todoId: number, depId: number) => void;
};

export default function TodoItem({
  todo,
  allTodos,
  onDelete,
  onAddDep,
  onRemoveDep,
}: Props) {
  const [showDepSelect, setShowDepSelect] = useState(false);
  const [depError, setDepError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setImgError(false), [todo.imageUrl]);

  useEffect(() => {
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, []);

  const isOverdue =
    todo.dueDate && new Date(todo.dueDate) < new Date();

  const formatDate = (d: string | Date) =>
    new Date(d).toLocaleDateString("en-US", { timeZone: "UTC" });

  const existingDepIds = new Set(todo.dependsOn.map((d) => d.dependencyId));

  const availableDeps = allTodos.filter(
    (t) => t.id !== todo.id && !existingDepIds.has(t.id)
  );

  const handleAddDep = async (depId: number) => {
    setDepError(null);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    const error = await onAddDep(todo.id, depId);
    if (error) {
      setDepError(error);
      errorTimer.current = setTimeout(() => setDepError(null), 4000);
    } else {
      setShowDepSelect(false);
    }
  };

  const borderAccent = isOverdue
    ? "border-l-red-500"
    : todo.cpm?.isOnCriticalPath &&
        (todo.dependsOn.length > 0 || todo.dependedBy.length > 0)
      ? "border-l-amber-400"
      : "border-l-transparent";

  return (
    <li className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg border-l-4 ${borderAccent}`}>
      {/* Image banner */}
      {todo.imageUrl && !imgError ? (
        <div className="relative w-full h-36">
          <Image
            src={todo.imageUrl}
            alt={todo.title}
            fill
            className="object-cover"
            sizes="(max-width: 600px) 100vw, 600px"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="w-full h-4 bg-gradient-to-r from-orange-300 to-red-300" />
      )}

      <div className="p-4">
        {/* Title row */}
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-gray-800 font-medium text-lg leading-tight flex-1">
            {todo.title}
          </h3>
          <button
            onClick={() => onDelete(todo.id)}
            className="text-gray-400 hover:text-red-500 transition p-1 shrink-0"
            aria-label="Delete todo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {todo.dueDate && (
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                isOverdue
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              📅 {formatDate(todo.dueDate!)}
            </span>
          )}
          {todo.cpm &&
            todo.dependsOn.length > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                Can start: {formatDate(todo.cpm.earliestStart)}
              </span>
            )}
          {todo.cpm?.isOnCriticalPath && todo.dependsOn.length + todo.dependedBy.length > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
              Critical Path
            </span>
          )}
        </div>

        {/* Dependency chips */}
        {todo.dependsOn.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-xs text-gray-400">Depends on:</span>
            {todo.dependsOn.map((dep) => (
              <span
                key={dep.dependencyId}
                className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full"
              >
                {dep.dependency.title.length > 20
                  ? dep.dependency.title.slice(0, 20) + "…"
                  : dep.dependency.title}
                <button
                  onClick={() => onRemoveDep(todo.id, dep.dependencyId)}
                  className="hover:text-red-600 transition"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Blocks display */}
        {todo.dependedBy.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs text-gray-400">Blocks:</span>
            {todo.dependedBy.map((dep) => (
              <span
                key={dep.dependentId}
                className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full"
              >
                {dep.dependent.title.length > 20
                  ? dep.dependent.title.slice(0, 20) + "…"
                  : dep.dependent.title}
              </span>
            ))}
          </div>
        )}

        {/* Add dependency */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          {depError && (
            <p className="text-xs text-red-600 mb-2">{depError}</p>
          )}
          {showDepSelect ? (
            <div className="flex flex-col gap-1">
              {availableDeps.length > 0 ? (
                availableDeps.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleAddDep(t.id)}
                    className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-orange-50 text-gray-700 transition"
                  >
                    {t.title}
                  </button>
                ))
              ) : (
                <p className="text-xs text-gray-400">No available tasks</p>
              )}
              <button
                onClick={() => setShowDepSelect(false)}
                className="text-xs text-gray-400 hover:text-gray-600 mt-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDepSelect(true)}
              className="text-xs text-orange-500 hover:text-orange-700 font-medium transition"
            >
              + Add dependency
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
