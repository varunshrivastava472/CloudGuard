const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const storageService = require('./storageService');

const JWT_SECRET = process.env.JWT_SECRET || 'cloudguard_default_jwt_secret_dev_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Hashes a plaintext password with bcrypt.
 * @param {string} password 
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verifies a plaintext password against a hash.
 * @param {string} password 
 * @param {string} hash 
 * @returns {Promise<boolean>}
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generates a signed JWT for a user.
 * @param {Object} user 
 * @returns {string}
 */
function generateToken(user) {
  const payload = {
    id: user.id || user._id,
    email: user.email,
    name: user.name,
    role: user.role || 'user'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * Verifies a JWT token.
 * @param {string} token 
 * @returns {Object} decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Registers a new user.
 */
async function register({ name, email, password, role = 'user' }) {
  if (!name || !name.trim()) {
    throw new Error('Name is required');
  }

  if (!email || !email.trim()) {
    throw new Error('Email is required');
  }

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email address format');
  }

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  // Check if email already exists
  const existing = await storageService.findUserByEmail(email);
  if (existing) {
    throw new Error('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);

  const newUser = await storageService.createUser({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role
  });

  const token = generateToken(newUser);

  return {
    token,
    user: {
      id: newUser.id || newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    }
  };
}

/**
 * Authenticates user credentials and generates token.
 */
async function login({ email, password }) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const user = await storageService.findUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  register,
  login
};
