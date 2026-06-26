const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');
const authRouter = require('./routes/auth');

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/auth', authRouter);

app.get('/profile', authMiddleware, (req, res) => {
  res.json({ id: req.user.sub, username: req.user.username });
});

app.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: 'secret_data', user: req.user.username });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Auth backend running on :${PORT}`);
});
