const notFound = (req, res, next) => {
  res.status(404);
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.json({ success: false, message: `Resource not found: ${req.originalUrl}` });
  }
  res.render('404', { title: '404 - Page Not Found', url: req.originalUrl });
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  console.error('[Error Details]:', err.stack);

  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.json({
      success: false,
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
  }

  res.render('500', {
    title: '500 - Server Error',
    message: err.message,
    error: process.env.NODE_ENV === 'production' ? null : err
  });
};

module.exports = {
  notFound,
  errorHandler
};
