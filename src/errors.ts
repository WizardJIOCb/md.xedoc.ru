export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = "File is too large") {
    super(message, 413);
    this.name = "PayloadTooLargeError";
  }
}
