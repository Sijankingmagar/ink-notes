// =============================================
// INK NOTES — BACKEND SERVER
// File: server.js
// =============================================

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authRoutes  = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const adminRoutes = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ──
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
  credentials: true
}));
app.use(express.json());

// ── ROUTES ──
app.use('/api/auth',  authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);

// ── HEALTH CHECK ──
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Ink Notes API is live!',
    version: '1.0.0'
  });
});

// ── 404 HANDLER ──
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// ── START SERVER ──
app.listen(PORT, () => {
  console.log(`✅ Ink Notes server running on http://localhost:${PORT}`);
});