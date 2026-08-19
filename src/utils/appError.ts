/**
 * Custom AppError class to represent operational errors.
 * Operational errors are predictable failures (e.g., validation failures, unauthorized requests, database item not found).
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
    // 4xx errors are fails, 5xx are errors
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Capture the call stack trace and exclude this constructor from it
    Error.captureStackTrace(this.target, this.constructor);
  }

  // Helper getter because typescript compiler options can sometimes restrict target checking
  private get target(): Object {
    return this;
  }
}
