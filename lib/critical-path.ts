import { CriticalPathInfo } from "./types";

type TodoForCPM = {
  id: number;
  dueDate: Date | string | null;
  createdAt: Date | string;
  dependsOn: { dependencyId: number }[];
  dependedBy: { dependentId: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toMs(d: Date | string): number {
  return new Date(d).getTime();
}

export function computeCriticalPath(
  todos: TodoForCPM[]
): Map<number, CriticalPathInfo> {
  const result = new Map<number, CriticalPathInfo>();
  if (todos.length === 0) return result;

  const idSet = new Set(todos.map((t) => t.id));
  const todoMap = new Map(todos.map((t) => [t.id, t]));

  // Build adjacency: predecessors (what this task depends on)
  const predecessors = new Map<number, number[]>();
  const successors = new Map<number, number[]>();
  const inDegree = new Map<number, number>();

  for (const t of todos) {
    predecessors.set(t.id, []);
    successors.set(t.id, []);
    inDegree.set(t.id, 0);
  }

  for (const t of todos) {
    for (const dep of t.dependsOn) {
      if (!idSet.has(dep.dependencyId)) continue;
      predecessors.get(t.id)!.push(dep.dependencyId);
      successors.get(dep.dependencyId)!.push(t.id);
      inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1);
    }
  }

  // Kahn's topological sort
  const queue: number[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const topoOrder: number[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    topoOrder.push(id);
    for (const succ of successors.get(id) ?? []) {
      const newDeg = (inDegree.get(succ) ?? 1) - 1;
      inDegree.set(succ, newDeg);
      if (newDeg === 0) queue.push(succ);
    }
  }

  // If not all nodes in topo order, there's a cycle -- shouldn't happen
  // with write-time validation, but handle gracefully
  if (topoOrder.length !== todos.length) {
    for (const t of todos) {
      result.set(t.id, {
        earliestStart: new Date(t.createdAt).toISOString(),
        earliestFinish: (t.dueDate ? new Date(t.dueDate) : new Date(toMs(t.createdAt) + DAY_MS)).toISOString(),
        latestStart: new Date(t.createdAt).toISOString(),
        latestFinish: (t.dueDate ? new Date(t.dueDate) : new Date(toMs(t.createdAt) + DAY_MS)).toISOString(),
        slack: 0,
        isOnCriticalPath: false,
      });
    }
    return result;
  }

  // Forward pass
  const ES = new Map<number, number>();
  const EF = new Map<number, number>();

  for (const id of topoOrder) {
    const t = todoMap.get(id)!;
    const preds = predecessors.get(id) ?? [];

    let es: number;
    if (preds.length === 0) {
      es = toMs(t.createdAt);
    } else {
      es = Math.max(...preds.map((p) => EF.get(p)!));
    }

    const ef = t.dueDate
      ? Math.max(toMs(t.dueDate), es + DAY_MS)
      : es + DAY_MS;

    ES.set(id, es);
    EF.set(id, ef);
  }

  // Backward pass
  const LS = new Map<number, number>();
  const LF = new Map<number, number>();

  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const id = topoOrder[i];
    const succs = successors.get(id) ?? [];
    const duration = EF.get(id)! - ES.get(id)!;

    let lf: number;
    if (succs.length === 0) {
      lf = EF.get(id)!;
    } else {
      lf = Math.min(...succs.map((s) => LS.get(s)!));
    }

    const ls = lf - duration;
    LF.set(id, lf);
    LS.set(id, ls);
  }

  // Compute slack and critical path
  for (const id of topoOrder) {
    const es = ES.get(id)!;
    const ef = EF.get(id)!;
    const ls = LS.get(id)!;
    const lf = LF.get(id)!;
    const slack = ls - es;

    result.set(id, {
      earliestStart: new Date(es).toISOString(),
      earliestFinish: new Date(ef).toISOString(),
      latestStart: new Date(ls).toISOString(),
      latestFinish: new Date(lf).toISOString(),
      slack,
      isOnCriticalPath: Math.abs(slack) < 1000, // within 1 second tolerance
    });
  }

  return result;
}
