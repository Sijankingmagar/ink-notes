// =============================================
// INK NOTES — AUTH ROUTES
// File: routes/auth.js
// =============================================

const express  = require('express');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { protect } = require('../middleware/auth');

const router   = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── HELPER: Generate JWT token ──
const generateToken = (user) => {
  return jwt.sign(
    {
      id:    user.id,
      email: user.email,
      role:  user.role || 'user'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ── SIGNUP ──
// POST /api/auth/signup
// Body: { full_name, email, password }
router.post('/signup', async (req, res) => {
  try {
    console.log('Signup body:', req.body);
    const { full_name, email, password } = req.body;

    // Validate input
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Please fill in all fields' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });

    if (authError) {
      console.log('Auth error:', authError.message);
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // Create profile in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id:        userId,
        full_name,
        email,
        role:      'user',
        plan:      'free'
      });

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    // Generate JWT
    const token = generateToken({
      id:    userId,
      email,
      role:  'user'
    });

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id:        userId,
        full_name,
        email,
        role:      'user',
        plan:      'free'
      }
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// ── LOGIN ──
// POST /api/auth/login
// Body: { email, password }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter email and password' });
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userId = authData.user.id;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(400).json({ error: 'Profile not found' });
    }

    // Generate JWT
    const token = generateToken({
      id:    userId,
      email: profile.email,
      role:  profile.role
    });

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id:        userId,
        full_name: profile.full_name,
        email:     profile.email,
        role:      profile.role,
        plan:      profile.plan
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ── GET MY PROFILE ──
// GET /api/auth/me
// Headers: Authorization: Bearer <token>
router.get('/me', protect, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ user: profile });

  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── UPDATE PROFILE ──
// PUT /api/auth/me
// Headers: Authorization: Bearer <token>
// Body: { full_name }
router.put('/me', protect, async (req, res) => {
  try {
    const { full_name } = req.body;

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Profile updated!', user: data });

  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── LOGOUT ──
// POST /api/auth/logout
router.post('/logout', protect, async (req, res) => {
  try {
    await supabase.auth.signOut();
    res.json({ message: 'Logged out successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error during logout' });
  }
});

module.exports = router;
