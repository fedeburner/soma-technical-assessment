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
    const isPrismaUnique =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002";
    if (isPrismaUnique) {
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
    let body: { dependencyId?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body is required" },
        { status: 400 }
      );
    }

    const dependencyId = Number(body.dependencyId);
    if (!dependencyId || isNaN(dependencyId)) {
      return NextResponse.json(
        { error: "Valid dependencyId is required" },
        { status: 400 }
      );
    }

    const result = await prisma.todoDependency.deleteMany({
      where: { dependentId, dependencyId },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { error: "Dependency not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Dependency removed" });
  } catch (error) {
    return NextResponse.json(
      { error: "Error removing dependency" },
      { status: 500 }
    );
  }
}
