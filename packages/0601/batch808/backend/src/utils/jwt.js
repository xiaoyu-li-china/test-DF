const jwt = require('jsonwebtoken');

const ACCESS_SECRET = 'access-secret-b808';
const REFRESH_SECRET = 'refresh-secret-b808';
const ACCESS_TTL = '15s';
const REFRESH_TTL = '7d';

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = {
  ACCESS_SECRET,
  REFRESH_SECRET,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
