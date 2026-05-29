const { isAppError } = require("../core/errors");

function errorHandler(err, _req, res, _next) {
  const requestId = _req.requestId;
  if (isAppError(err)) {
    return res.status(err.status).json({
      errorCode: err.errorCode,
      message: err.message,
      details: err.details,
      requestId,
    });
  }

  return res.status(500).json({
    errorCode: "INTERNAL_SERVER_ERROR",
    message: err?.message || "Server error.",
    requestId,
  });
}

module.exports = { errorHandler };
