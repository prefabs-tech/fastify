interface StackFrame {
  columnNumber: number;
  fileName: string;
  functionName: string;
  lineNumber: number;
}

type ErrorResponse = {
  code: string;
  message: string;
  name: string;
  stack?: StackFrame[];
  statusCode: number;
};

export type { ErrorResponse, StackFrame };
