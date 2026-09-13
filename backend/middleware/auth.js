const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user, remember = false) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
  return jwt.sign(
    { id: user._id, role: user.role },
    secret,
    { expiresIn: remember ? '30d' : '1d' }
  );
};

const requireAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
    const decoded = jwt.verify(token, secret);

    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    req.userId = req.user._id;
    next(); // Explicit call to next middleware
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

module.exports = {
  signToken,
  requireAuth,
};