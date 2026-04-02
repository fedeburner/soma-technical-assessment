"use client";
import { useState, useEffect } from "react";
import { TodoWithCPM } from "@/lib/types";
import TodoForm from "@/components/TodoForm";
import TodoList from "@/components/TodoList";
import DependencyGraph from "@/components/DependencyGraph";

export default function Home() {
  const [todos, setTodos] = useState<TodoWithCPM[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = async () => {
    try {
      setError(null);
      const res = await fetch("/api/todos");
      if (!res.ok) throw new Error("Failed to load tasks");
      const data = await res.json();
      setTodos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleAdd = async (title: string, dueDate: string | null) => {
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, dueDate }),
    });
    await fetchTodos();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    await fetchTodos();
  };

  const handleAddDep = async (
    todoId: number,
    depId: number
  ): Promise<string | null> => {
    const res = await fetch(`/api/todos/${todoId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dependencyId: depId }),
    });
    if (!res.ok) {
      const data = await res.json();
      return data.error || "Failed to add dependency";
    }
    await fetchTodos();
    return null;
  };

  const handleRemoveDep = async (todoId: number, depId: number) => {
    await fetch(`/api/todos/${todoId}/dependencies`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dependencyId: depId }),
    });
    await fetchTodos();
  };

  const hasDeps = todos.some(
    (t) => t.dependsOn.length > 0 || t.dependedBy.length > 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex flex-col items-center p-4 sm:p-8">
      <div className={`w-full transition-all duration-500 ${hasDeps ? "max-w-3xl" : "max-w-xl"}`}>
        <h1 className="text-4xl font-bold text-center text-white mb-8 tracking-tight">
          Things To Do
        </h1>

        <div className={`${hasDeps ? "max-w-xl mx-auto" : ""}`}>
          <TodoForm onAdd={handleAdd} />

          {error && (
            <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
              <button onClick={fetchTodos} className="ml-2 underline font-medium">
                Retry
              </button>
            </div>
          )}

          <TodoList
            todos={todos}
            onDelete={handleDelete}
            onAddDep={handleAddDep}
            onRemoveDep={handleRemoveDep}
          />
        </div>

        <DependencyGraph todos={todos} />
      </div>
    </div>
  );
}
