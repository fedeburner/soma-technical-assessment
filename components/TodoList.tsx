"use client";
import { TodoWithCPM } from "@/lib/types";
import TodoItem from "./TodoItem";

type Props = {
  todos: TodoWithCPM[];
  onDelete: (id: number) => void;
  onAddDep: (todoId: number, depId: number) => Promise<string | null>;
  onRemoveDep: (todoId: number, depId: number) => void;
};

export default function TodoList({
  todos,
  onDelete,
  onAddDep,
  onRemoveDep,
}: Props) {
  if (todos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70 text-lg">No tasks yet. Add one above!</p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          allTodos={todos}
          onDelete={onDelete}
          onAddDep={onAddDep}
          onRemoveDep={onRemoveDep}
        />
      ))}
    </ul>
  );
}
