import { Todo, TodoDependency } from "@prisma/client";

export type TodoWithDeps = Todo & {
  dependsOn: (TodoDependency & { dependency: Todo })[];
  dependedBy: (TodoDependency & { dependent: Todo })[];
};

export type CriticalPathInfo = {
  earliestStart: string;
  earliestFinish: string;
  latestStart: string;
  latestFinish: string;
  slack: number;
  isOnCriticalPath: boolean;
};

export type TodoWithCPM = TodoWithDeps & {
  cpm?: CriticalPathInfo;
};
