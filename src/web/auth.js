/**
 * web/auth.js
 * Authentication middleware — session-based with bcrypt password hashing.
 * The admin is auto-created from the OWNER_JID env var on first startup.
 */
import bcrypt from 'bcrypt';
import { stmts, db } from '../database.js';
import config from '../config.js';
import logger from '../logger.js';

const SESSION_COOKIE = 'spyro_session';

/** Ensure the admin account exists (created from OWNER_JID phone number). */
export function ensureAdminAccount() {
  try {
    const adminEmail = 'admin@spyro.bot';
    let admin = stmts.getUserByEmail.get(adminEmail);
    if (!admin) {
      // Create admin with a default password (the owner's phone number)
      const phone = config.OWNER_JID?.split('@')[0] || 'admin';
      const hash = bcrypt.hashSync(phone, 10);
      stmts.createUser.run(adminEmail, phone, hash, 'admin');
      logger.info({ email: adminEmail, phone }, 'admin account created');
      logger.info('   ⚠️  Default admin password is your phone number. Change it via .changepassword');
    }
  } catch (err) {
    logger.error({ err }, 'failed to create admin account');
  }
}

/** Auth middleware — attaches req.user or redirects to login. */
export function requireAuth(req, res, next) {
  const userId = req.session?.userId;
  if (!userId) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.redirect('/login');
  }
  try {
    const user = stmts.getUserById.get(userId);
    if (!user || user.banned) {
      req.session.destroy(() => {});
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ error: 'Account banned or not found' });
      }
      return res.redirect('/login');
    }
    req.user = user;
    next();
  } catch (err) {
    logger.error({ err }, 'auth middleware error');
    return res.status(500).json({ error: 'Auth error' });
  }
}

/** Admin-only middleware. */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return res.redirect('/dashboard');
  }
  next();
}

/** Signup a new user. */
export function signupUser(email, phone, password) {
  email = email.toLowerCase().trim();
  if (!email || !password) throw new Error('Email and password required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const existing = stmts.getUserByEmail.get(email);
  if (existing) throw new Error('Email already registered');

  const hash = bcrypt.hashSync(password, 10);
  const info = stmts.createUser.run(email, phone || null, hash, 'user');
  return { id: info.lastInsertRowid, email, phone, role: 'user' };
}

/** Login a user. Returns the user object or throws. */
export function loginUser(email, password) {
  email = email.toLowerCase().trim();
  const user = stmts.getUserByEmail.get(email);
  if (!user) throw new Error('Invalid email or password');
  if (user.banned) throw new Error('Account banned. Contact admin.');
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) throw new Error('Invalid email or password');
  return { id: user.id, email: user.email, phone: user.phone, role: user.role };
}

/** Change password. */
export function changePassword(userId, oldPassword, newPassword) {
  const user = stmts.getUserById.get(userId);
  if (!user) throw new Error('User not found');
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    throw new Error('Current password is incorrect');
  }
  if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
}
