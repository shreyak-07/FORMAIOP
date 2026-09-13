const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { signToken } = require('../middleware/auth');

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  createdAt: u.createdAt,
});

function validateCredentials(body, { signup = false } = {}) {
  if (!body || typeof body !== 'object') return 'Invalid request';
  if (signup && (!body.name || body.name.trim().length < 2)) return 'Name is required';
  if (!emailRe.test(String(body.email || ''))) return 'Please enter a valid email';
  if (String(body.password || '').length < 8) return 'Password must be at least 8 characters';
  return null;
}

const register = async (req, res) => {
  try {
    const msg = validateCredentials(req.body, { signup: true });
    if (msg) return res.status(400).json({ success: false, message: msg });

    const email = req.body.email.trim().toLowerCase();
    if (await User.exists({ email })) {
      return res.status(409).json({ success: false, message: 'An account with that email already exists' });
    }

    const hash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({ name: req.body.name.trim(), email, passwordHash: hash });

    return res.status(201).json({
      success: true,
      data: { user: publicUser(user), token: signToken(user, true) },
    });
  } catch (error) {
    console.error('Register error:', error);
    // Real error message sent to client to locate exact breakdown
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const msg = validateCredentials(req.body);
    if (msg) return res.status(400).json({ success: false, message: msg });

    const user = await User.findOne({ email: req.body.email.trim().toLowerCase() }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    return res.json({
      success: true,
      data: { user: publicUser(user), token: signToken(user, !!req.body.remember) },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const updateMe = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (name.length < 2) return res.status(400).json({ success: false, message: 'Name is required' });

    req.user.name = name;
    await req.user.save();

    return res.json({ success: true, data: { user: publicUser(req.user) } });
  } catch (error) {
    console.error('UpdateMe error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const current = String(req.body?.currentPassword || '');
    const nextPass = String(req.body?.newPassword || '');

    if (nextPass.length < 8) return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });

    const user = await User.findById(req.userId).select('+passwordHash');
    if (!(await bcrypt.compare(current, user.passwordHash))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(nextPass, 12);
    await user.save();

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const me = async (req, res) => {
  try {
    return res.json({ success: true, data: { user: publicUser(req.user) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const logout = async (req, res) => {
  try {
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (emailRe.test(email)) {
      const user = await User.findOne({ email });
      if (user) {
        const raw = crypto.randomBytes(32).toString('hex');
        await PasswordResetToken.deleteMany({ userId: user._id });
        await PasswordResetToken.create({
          userId: user._id,
          tokenHash: crypto.createHash('sha256').update(raw).digest('hex'),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });

        if (process.env.NODE_ENV !== 'production') {
          console.log(`Password reset token for ${email}: ${raw}`);
        }
      }
    }

    return res.json({ success: true, message: 'If an account exists, password reset instructions have been created.' });
  } catch (error) {
    console.error('ForgotPassword error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');

    if (token.length < 20 || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Invalid reset request' });
    }

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await PasswordResetToken.findOne({ 
      tokenHash: hash,
      expiresAt: { $gt: new Date() }
    });

    if (!record) return res.status(400).json({ success: false, message: 'Reset link is invalid or expired' });

    const user = await User.findById(record.userId);
    if (!user) return res.status(400).json({ success: false, message: 'Reset link is invalid or expired' });

    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();
    await PasswordResetToken.deleteOne({ _id: record._id });

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('ResetPassword error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

module.exports = {
  register,
  login,
  me,
  updateMe,
  changePassword,
  logout,
  forgotPassword,
  resetPassword,
};