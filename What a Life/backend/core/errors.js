class AppError extends Error {
  constructor(errorCode, message, status = 400, details = undefined) {
    super(message);
    this.name = "AppError";
    this.errorCode = errorCode;
    this.status = status;
    this.details = details;
  }
}

function isAppError(err) {
  return err instanceof AppError;
}

module.exports = {
  AppError,
  isAppError,
};
