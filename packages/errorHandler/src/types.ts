import { StackFrame } from "./httpError";

type ErrorResponse = {
  code: string;
  message: string;
  name: string;
  stack?: StackFrame[];
  statusCode: number;
};

export type { ErrorResponse };
