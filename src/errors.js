class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

class NotFoundError extends HttpError {
  constructor(message = "Video not found") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

module.exports = {
  HttpError,
  NotFoundError
};
