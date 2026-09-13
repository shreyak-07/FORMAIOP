// 1. Async Handler Wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 2. 404 Route Not Found Handler
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found - ${req.originalUrl}`,
  });
};

// 3. Central Error Handler (Express MUST see 4 params)
const errorHandler = (err, req, res, next) => {
  console.error('🔥 Global Server Error:', err);
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = {
  asyncHandler,
  notFoundHandler,
  errorHandler,
};