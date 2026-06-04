function enumErrorHandler(err, res) {
  // TODO
}

export default function globalErrorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    err,
    stackTrace: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
