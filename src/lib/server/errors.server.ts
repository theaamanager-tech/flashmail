export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Rate limit exceeded") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

export class DailyLimitError extends AppError {
  constructor(message = "Daily email limit reached") {
    super(message, 429, "DAILY_EMAIL_LIMIT_REACHED");
  }
}
