const { verifyToken } = require('../services/authService');

/**
 * Protect middleware: Ensures request has a valid Bearer JWT.
 */
function protect(req, res, next) {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.'
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authorization token',
      error: err.message
    });
  }
}

/**
 * Optional Auth middleware: Attaches user if token is present, but allows unauthenticated access.
 */
function optionalAuth(req, res, next) {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch {
      // Ignore token errors for optional auth
    }
  }

  next();
}

/**
 * Authorize roles middleware: Ensures user has required role(s).
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient privileges for this resource'
      });
    }
    next();
  };
}

module.exports = {
  protect,
  optionalAuth,
  authorize
};
