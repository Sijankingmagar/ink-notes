// =============================================
// INK NOTES — AUTH MIDDLEWARE
// File: middleware/auth.js
// =============================================

const jwt = require('jsonwebtoken');

// ── PROTECT ROUTE (any logged in user) ──
const protect = (req, res, next) => {
  try {
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authorized. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();

  } catch (err) {
    return res.status(401).json({ error: 'Not authorized. Invalid token.' });
  }
};

// ── ADMIN ONLY ROUTE ──
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
};

module.exports = { protect, adminOnly };

