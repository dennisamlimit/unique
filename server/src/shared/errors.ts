export class DatabaseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DatabaseError";
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string | number) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
