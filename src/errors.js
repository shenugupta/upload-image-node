class NotFoundError extends Error {
  constructor(message = "Video not found") {
    super(message);
    this.name = "NotFoundError";
    this.status = 404;
  }
}

module.exports = {
  NotFoundError
};
