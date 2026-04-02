import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function wouldCreateCycle(
  dependentId: number,
  dependencyId: number
): Promise<string[] | null> {
  const allTodos = await prisma.todo.findMany({
    include: { dependsOn: { include: { dependency: true } } },
  });

  const todoMap = new Map(allTodos.map((t) => [t.id, t]));
  const depTodo = todoMap.get(dependencyId);
  if (!depTodo) return null;

  const visited = new Set<number>();
  const path: string[] = [];

  function dfs(currentId: number): boolean {
    if (currentId === dependentId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);

    const todo = todoMap.get(currentId);
    if (!todo) return false;

    for (const dep of todo.dependsOn) {
      path.push(dep.dependency.title);
      if (dfs(dep.dependencyId)) return true;
      path.pop();
    }
    return false;
  }

  path.push(depTodo.title);
  const hasCycle = dfs(dependencyId);
  return hasCycle ? path : null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const dependentId = parseInt(params.id);
  if (isNaN(dependentId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const { dependencyId } = await request.json();
    if (!dependencyId || typeof dependencyId !== "number") {
      return NextResponse.json(
        { error: "dependencyId is required" },
        { status: 400 }
      );
    }

    if (dependentId === dependencyId) {
      return NextResponse.json(
        { error: "A task cannot depend on itself" },
        { status: 400 }
      );
    }

    const [dependent, dependency] = await Promise.all([
      prisma.todo.findUnique({ where: { id: dependentId } }),
      prisma.todo.findUnique({ where: { id: dependencyId } }),
    ]);
    if (!dependent || !dependency) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const cyclePath = await wouldCreateCycle(dependentId, dependencyId);
    if (cyclePath) {
      return NextResponse.json(
        {
          error: `Adding this dependency would create a cycle: ${dependent.title} → ${cyclePath.join(" → ")}`,
        },
        { status: 400 }
      );
    }

    const edge = await prisma.todoDependency.create({
      data: { dependentId, dependencyId },
    });

    return NextResponse.json(edge, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "This dependency already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Error adding dependency" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const dependentId = parseInt(params.id);
  if (isNaN(dependentId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const { dependencyId } = await request.json();
    await prisma.todoDependency.deleteMany({
      where: { dependentId, dependencyId },
    });
    return NextResponse.json({ message: "Dependency removed" });
  } catch (error) {
    return NextResponse.json(
      { error: "Error removing dependency" },
      { status: 500 }
    );
  }
}
