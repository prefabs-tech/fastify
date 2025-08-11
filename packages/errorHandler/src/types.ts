import type { StackFrame } from "stack-trace";

type ErrorResponse = {
  error?: string;
  code?: string;
  message: string;
  name: string;
  stack?: StackFrame[];
  statusCode: number;
};

export type { ErrorResponse };

export { type StackFrame } from "stack-trace";
