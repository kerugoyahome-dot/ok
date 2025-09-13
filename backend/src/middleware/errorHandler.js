export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal server error',
    status: err.status || 500
  };

  // Specific error handling
  if (err.code === '23505') {
    // PostgreSQL unique violation
    error = {
      message: 'Resource already exists',
      status: 409
    };
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    error = {
      message: 'Referenced resource not found',
      status: 400
    };
  } else if (err.code === '23502') {
    // PostgreSQL not null violation
    error = {
      message: 'Required field missing',
      status: 400
    };
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};