"use client";
import { useMemo } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  BackgroundVariant,
  Handle,
  Position,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { TodoWithCPM } from "@/lib/types";
import "@xyflow/react/dist/style.css";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 110;

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

type TodoNodeData = {
  title: string;
  dueDate: string | null;
  earliestStart: string | null;
  isOnCriticalPath: boolean;
  isOverdue: boolean;
};

function TodoNode({ data }: { data: TodoNodeData }) {
  let borderColor = "border-gray-200";
  if (data.isOnCriticalPath) borderColor = "border-amber-400";
  if (data.isOverdue) borderColor = "border-red-400";

  return (
    <div
      className={`bg-white rounded-lg border-2 ${borderColor} shadow-md px-4 py-3 w-[240px] ${
        data.isOnCriticalPath ? "ring-2 ring-amber-200" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-300 !w-2 !h-2" />
      <p className="text-sm font-semibold text-gray-800 truncate">
        {data.title}
      </p>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {data.dueDate && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              data.isOverdue
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            Due: {new Date(data.dueDate).toLocaleDateString()}
          </span>
        )}
        {data.earliestStart && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
            Start: {new Date(data.earliestStart).toLocaleDateString()}
          </span>
        )}
        {data.isOnCriticalPath && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            Critical
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { todo: TodoNode };

type Props = {
  todos: TodoWithCPM[];
};

export default function DependencyGraph({ todos }: Props) {
  const graphData = useMemo(() => {
    const hasDeps = todos.some(
      (t) => t.dependsOn.length > 0 || t.dependedBy.length > 0
    );
    if (!hasDeps) return null;

    const connectedIds = new Set<number>();
    for (const t of todos) {
      if (t.dependsOn.length > 0 || t.dependedBy.length > 0) {
        connectedIds.add(t.id);
        t.dependsOn.forEach((d) => connectedIds.add(d.dependencyId));
        t.dependedBy.forEach((d) => connectedIds.add(d.dependentId));
      }
    }

    const connectedTodos = todos.filter((t) => connectedIds.has(t.id));

    const rawNodes: Node[] = connectedTodos.map((t) => ({
      id: String(t.id),
      type: "todo",
      position: { x: 0, y: 0 },
      data: {
        title: t.title,
        dueDate: t.dueDate ? String(t.dueDate) : null,
        earliestStart:
          t.dependsOn.length > 0 ? (t.cpm?.earliestStart ?? null) : null,
        isOnCriticalPath: t.cpm?.isOnCriticalPath ?? false,
        isOverdue: t.dueDate ? new Date(t.dueDate) < new Date() : false,
      } satisfies TodoNodeData,
    }));

    const rawEdges: Edge[] = [];
    for (const t of connectedTodos) {
      for (const dep of t.dependsOn) {
        const depTodo = todos.find((x) => x.id === dep.dependencyId);
        const bothCritical =
          t.cpm?.isOnCriticalPath && depTodo?.cpm?.isOnCriticalPath;

        rawEdges.push({
          id: `${dep.dependencyId}-${t.id}`,
          source: String(dep.dependencyId),
          target: String(t.id),
          animated: !!bothCritical,
          style: {
            stroke: bothCritical ? "#f59e0b" : "#d1d5db",
            strokeWidth: bothCritical ? 2.5 : 1.5,
          },
        });
      }
    }

    return getLayoutedElements(rawNodes, rawEdges);
  }, [todos]);

  const graphKey = useMemo(
    () =>
      todos
        .map((t) => `${t.id}:${t.dependsOn.length}:${t.dependedBy.length}`)
        .join(","),
    [todos]
  );

  if (!graphData) return null;

  return (
    <div className="mt-8 bg-white/95 backdrop-blur rounded-xl shadow-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Dependency Graph
        </h2>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded bg-amber-400 inline-block" />
            Critical Path
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded bg-gray-300 inline-block" />
            Dependency
          </span>
        </div>
      </div>
      <div className="h-[400px]">
        <ReactFlow
          key={graphKey}
          nodes={graphData.nodes}
          edges={graphData.edges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={0.5} color="#e5e7eb" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
