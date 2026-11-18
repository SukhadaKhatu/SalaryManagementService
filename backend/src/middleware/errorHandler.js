export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof AppError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Request body is too large.' } });
  console.error(error);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
}
