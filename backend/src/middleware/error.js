export function notFoundHandler(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  if (!error.status || error.status >= 500) {
    console.error(error);
  }

  if (error.code === '23505') {
    return res.status(409).json({
      error: {
        message: 'A record with this unique value already exists',
        details: error.detail,
      },
    });
  }

  if (error.code === '23503') {
    return res.status(400).json({
      error: {
        message: 'Referenced record does not exist',
        details: error.detail,
      },
    });
  }

  const status = error.status || 500;
  res.status(status).json({
    error: {
      message: status === 500 ? 'Internal server error' : error.message,
      details: error.details,
    },
  });
}
