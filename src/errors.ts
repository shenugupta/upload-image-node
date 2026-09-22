export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Video not found") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }

  return String(error);
}

export function isNamedError(
  error: unknown
): error is { name: string; message: string; $metadata?: { httpStatusCode?: number } } {
  return typeof error === "object" && error !== null && "name" in error;
}

export function isPgError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}
