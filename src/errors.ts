import type { CaughtError, ErrorLike } from "./types";

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

export function errorMessage(error: CaughtError): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "code" in error && error.code != null) {
    return String(error.code);
  }

  if (typeof error === "object" && error !== null && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return String(error ?? "");
}

export function isNamedError(
  error: CaughtError
): error is ErrorLike & { name: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
  );
}

export function isPgError(error: CaughtError): error is ErrorLike & { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  );
}
