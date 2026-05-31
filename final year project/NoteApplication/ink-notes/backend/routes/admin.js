// =============================================
// INK NOTES — ADMIN ROUTES
// File: routes/admin.js
// =============================================

const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const { protect, adminOnly } = require('../middleware/auth');

const router   = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// All admin routes require login AND admin role
router.use(protect);
router.use(adminOnly);

// ── GET ALL USERS ──
// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ users: data });

  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET SINGLE USER ──
// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'User not found' });

    // Get their notes count
    const { count } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.params.id);

    res.json({ user: { ...data, notes_count: count } });

  } catch (err) {
    console.error('Admin get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── SUSPEND USER ──
// PUT /api/admin/users/:id/suspend
router.put('/users/:id/suspend', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: 'suspended' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'User suspended', user: data });

  } catch (err) {
    console.error('Suspend user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── RESTORE USER ──
// PUT /api/admin/users/:id/restore
router.put('/users/:id/restore', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'User restored', user: data });

  } catch (err) {
    console.error('Restore user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CHANGE USER PLAN ──
// PUT /api/admin/users/:id/plan
// Body: { plan }
router.put('/users/:id/plan', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['free', 'pro', 'team'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Use free, pro, or team' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ plan })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: `User plan updated to ${plan}`, user: data });

  } catch (err) {
    console.error('Change plan error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE USER ──
// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    // Delete their notes first
    await supabase.from('notes').delete().eq('user_id', req.params.id);

    // Delete their profile
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'User permanently deleted' });

  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET STATS (dashboard numbers) ──
// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Total notes
    const { count: totalNotes } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true });

    // Pro users
    const { count: proUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'pro');

    // Team users
    const { count: teamUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'team');

    res.json({
      stats: {
        total_users: totalUsers,
        total_notes: totalNotes,
        pro_users:   proUsers,
        team_users:  teamUsers,
        free_users:  totalUsers - proUsers - teamUsers
      }
    });

  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;