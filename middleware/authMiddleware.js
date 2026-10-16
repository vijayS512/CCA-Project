const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'campusconnect_super_secret_jwt_key_2026_secure';

// Helper to extract token from cookies or authorization header
const extractToken = (req) => {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

// Check if user is authenticated
const isAuthenticated = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }
    req.flash('error_msg', 'Please log in to access this page.');
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.clearCookie('token');
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(401).json({ success: false, message: 'User no longer exists.' });
      }
      req.flash('error_msg', 'User session invalid. Please log in again.');
      return res.redirect('/auth/login');
    }

    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (err) {
    res.clearCookie('token');
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
    req.flash('error_msg', 'Session expired. Please log in again.');
    return res.redirect('/auth/login');
  }
};

// Check role permissions
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect('/auth/login');
    }

    if (!roles.includes(req.user.role)) {
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges.' });
      }
      req.flash('error_msg', `Access denied: Requires ${roles.join(' or ')} privileges.`);
      return res.redirect('/dashboard');
    }
    next();
  };
};

// Global middleware to populate currentUser if token exists (even on public pages)
const setUserLocals = async (req, res, next) => {
  res.locals.success_msg = req.flash ? req.flash('success_msg') : [];
  res.locals.error_msg = req.flash ? req.flash('error_msg') : [];
  res.locals.currentUser = null;
  res.locals.currentPath = req.path;

  const token = extractToken(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
        res.locals.currentUser = user;
      }
    } catch (err) {
      // invalid token, ignore
    }
  }
  next();
};

module.exports = {
  isAuthenticated,
  authorizeRoles,
  setUserLocals
};
