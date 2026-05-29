function requestLogger(req, res, next) {
  const started = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const durationMs = Date.now() - started;
    const requestId = req.requestId || "-";
    console.log(`[${requestId}] ${method} ${originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
  });

  next();
}

module.exports = { requestLogger };
