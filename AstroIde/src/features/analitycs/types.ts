export interface AnalyticsProject {
  name: string;
  path: string;
  kernel: "python" | "r" | "julia";
  dependencies: string[];
  createdAt: number;
}

export interface Cell {
  id: string;
  type: "code" | "markdown";
  content: string;
  output: string;
  outputType: "text" | "error" | "image";
  isRunning: boolean;
}

export interface Variable {
  name: string;
  type: string;
  value: string;
}

export interface ProjectFile {
  name: string;
  path: string;
}
