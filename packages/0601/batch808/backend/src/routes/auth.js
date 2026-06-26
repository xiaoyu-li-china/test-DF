const express = require('express');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');

const router = express.Router();

const users = [
  { id: 1, username: 'admin', password: 'password123' },
];

const refreshTokens = new Set();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const payload = { sub: user.id, username: user.username };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  refreshTokens.add(refreshToken);

  res.json({ accessToken, refreshToken });
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'missing_refresh_token' });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    if (!refreshTokens.has(refreshToken)) {
      return res.status(401).json({ error: 'invalid_refresh_token' });
    }

    const payload = { sub: decoded.sub, username: decoded.username };
    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    refreshTokens.delete(refreshToken);
    refreshTokens.add(newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (refreshToken) refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: 'refresh_token_expired' });
  }
});

router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.json({ message: 'logged_out' });
});

module.exports = router;
