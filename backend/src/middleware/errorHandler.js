const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Standardized error response
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    // In production, don't expose stack traces
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = { errorHandler };
