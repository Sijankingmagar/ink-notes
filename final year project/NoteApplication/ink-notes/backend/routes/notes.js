// =============================================
// INK NOTES — NOTES ROUTES
// File: routes/notes.js
// =============================================

const express  = require('express');
const { createClient } = require('@supabase/supabase-js');
const { protect } = require('../middleware/auth');

const router   = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// All notes routes are protected — must be logged in
router.use(protect);

// ── GET ALL NOTES ──
// GET /api/notes
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('deleted', false)
      .order('updated_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ notes: data });

  } catch (err) {
    console.error('Get notes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET SINGLE NOTE ──
// GET /api/notes/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) return res.status(404).json({ error: 'Note not found' });

    res.json({ note: data });

  } catch (err) {
    console.error('Get note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CREATE NOTE ──
// POST /api/notes
// Body: { title, body, tags, pinned, color }
router.post('/', async (req, res) => {
  try {
    const { title, body, tags, pinned, color } = req.body;

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id:    req.user.id,
        title:      title   || '',
        body:       body    || '',
        tags:       tags    || [],
        pinned:     pinned  || false,
        color:      color   || 0,
        deleted:    false
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({ message: 'Note created!', note: data });

  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── UPDATE NOTE ──
// PUT /api/notes/:id
// Body: { title, body, tags, pinned, color }
router.put('/:id', async (req, res) => {
  try {
    const { title, body, tags, pinned, color } = req.body;

    const { data, error } = await supabase
      .from('notes')
      .update({
        title,
        body,
        tags,
        pinned,
        color,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Note updated!', note: data });

  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── SOFT DELETE (move to trash) ──
// DELETE /api/notes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notes')
      .update({
        deleted:    true,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Note moved to trash!' });

  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── RESTORE FROM TRASH ──
// PUT /api/notes/:id/restore
router.put('/:id/restore', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notes')
      .update({
        deleted:    false,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Note restored!' });

  } catch (err) {
    console.error('Restore note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET TRASH ──
// GET /api/notes/trash/all
router.get('/trash/all', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('deleted', true)
      .order('updated_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ notes: data });

  } catch (err) {
    console.error('Get trash error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PERMANENT DELETE ──
// DELETE /api/notes/:id/permanent
router.delete('/:id/permanent', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Note permanently deleted!' });

  } catch (err) {
    console.error('Permanent delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── SEARCH NOTES ──
// GET /api/notes/search?q=keyword
router.get('/search/query', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ notes: [] });

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('deleted', false)
      .or(`title.ilike.%${q}%,body.ilike.%${q}%`)
      .order('updated_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ notes: data });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;