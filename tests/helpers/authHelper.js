// tests/helpers/authHelper.js
// Authentication helpers for tests

const jwt = require("jsonwebtoken");

/**
 * Generate a JWT token for testing
 * @param {object} user - User object with id, email, username
 * @returns {string} JWT token
 */
function generateTestToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    username: user.username,
    avatar: user.avatar || null,
    name: user.name || null,
    country: user.country || null,
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "2h" });
}

/**
 * Create Authorization header with Bearer token
 * @param {object} user - User object
 * @returns {string} Authorization header value
 */
function makeAuthHeader(user) {
  const token = generateTestToken(user);
  return `Bearer ${token}`;
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
function verifyTestToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = {
  generateTestToken,
  makeAuthHeader,
  verifyTestToken,
};
