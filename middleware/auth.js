const jwt = require('jsonwebtoken');

// Protects admin routes — checks for a valid JWT token
const adminOnly = (req, res, next) => {
  // Token can come from Authorization header OR a cookie
  const token = req.headers.authorization?.split(' ')[1]  // "Bearer <token>"
             || req.cookies?.adminToken;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
};

module.exports = { adminOnly };