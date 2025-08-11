export class CustomError extends Error {
  public code?: string;

  constructor(message: string, code?: string) {
    super(message);

    this.code = code;
    this.name = this.constructor.name; // sets name to "CustomError" so that it works in logs

    // (error instanceof CustomError) and (error instanceof Error) both works because of this
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
