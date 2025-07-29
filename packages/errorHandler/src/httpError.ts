export interface StackFrame {
  columnNumber: number;
  fileName: string;
  functionName: string;
  lineNumber: number;
}

export const parseStack = (stack: string): StackFrame[] => {
  // split stack into lines and remove the first line (error message)
  const stackLines = stack.split("\n").slice(1);

  return stackLines
    .map((line) => {
      // match the stack trace line pattern
      // Example: "    at Object.<anonymous> (/app/src/controllers/workspace.ts:42:15)"
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);

      if (match) {
        return {
          columnNumber: Number.parseInt(match[4], 10),
          fileName: match[2].trim(),
          functionName: match[1].trim(),
          lineNumber: Number.parseInt(match[3], 10),
        };
      }

      // Handle cases where the stack trace format is different
      // Example: "    at /app/src/controllers/workspace.ts:42:15"
      const simpleMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);

      if (simpleMatch) {
        return {
          columnNumber: Number.parseInt(simpleMatch[3], 10),
          fileName: simpleMatch[1].trim(),
          functionName: "anonymous",
          lineNumber: Number.parseInt(simpleMatch[2], 10),
        };
      }

      return;
    })
    .filter((frame): frame is StackFrame => frame !== undefined);
};
