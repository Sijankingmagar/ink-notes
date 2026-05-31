/* =============================================
   NOTES APP — COMPLETE WORKING app.js
   Connected to Node.js Backend + Supabase
   ============================================= */

const API_URL = 'http://localhost:5000/api';

// ── STATE ──
let notes         = [];
let activeId      = null;
let currentFilter = 'all';
let sortAsc       = false;
let searchQuery   = '';
let saveTimeout   = null;
let token         = localStorage.getItem('notes_token') || null;
let currentUser   = JSON.parse(localStorage.getItem('notes_user') || 'null');
let chatHistory   = [];
let aiPanelOpen   = false;
let aiActiveTab   = 'write';
let chatSearchMode = 'all';
let aiIsLoading   = false;
const AI_KEY_STORAGE = 'ink_anthropic_key';

const TAGS_META = [
  { name: 'Work',     color: '#6ab0e0' },
  { name: 'Personal', color: '#6ec47a' },
  { name: 'Ideas',    color: '#e8a83a' },
  { name: 'Journal',  color: '#c47ae0' },
  { name: 'Research', color: '#e07a6a' },
];
const NOTE_COLORS = ['#1e1c18','#1a1e1a','#1a1820','#201a18','#1a1a20'];
const NOTE_COLORS_LABEL = ['Default','Forest','Night','Ember','Slate'];

// ════════════════════════════════
// API HELPER
// ════════════════════════════════
async function api(method, endpoint, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(`${API_URL}${endpoint}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

// ════════════════════════════════
// AUTH
// ════════════════════════════════
function showLogin()  {
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('loginForm').style.display  = '';
}
function showSignup() {
  document.getElementById('loginForm').style.display  = 'none';
  document.getElementById('signupForm').style.display = '';
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function hideLoginScreen() {
  document.getElementById('loginScreen').style.display = 'none';
  document.body.style.overflow = '';
}

async function checkAuth() {
  if (!token) { showLoginScreen(); return; }
  try {
    const data  = await api('GET', '/auth/me');
    currentUser = data.user;
    localStorage.setItem('notes_user', JSON.stringify(currentUser));
    hideLoginScreen();
    updateUserCard();
    await loadNotes();
  } catch {
    token = null;
    localStorage.removeItem('notes_token');
    localStorage.removeItem('notes_user');
    showLoginScreen();
  }
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value.trim();
  if (!email || !pass) { toast('Enter email and password', 'var(--red)'); return; }
  const btn = document.getElementById('loginBtn');
  btn.textContent = 'Signing in...'; btn.disabled = true;
  try {
    const data  = await api('POST', '/auth/login', { email, password: pass });
    token       = data.token;
    currentUser = data.user;
    localStorage.setItem('notes_token', token);
    localStorage.setItem('notes_user', JSON.stringify(currentUser));
    hideLoginScreen();
    updateUserCard();
    await loadNotes();
    toast('Welcome back ' + (currentUser.full_name || '') + '!', 'var(--green)');
  } catch (err) {
    toast(err.message || 'Login failed', 'var(--red)');
  } finally { btn.textContent = 'Sign in'; btn.disabled = false; }
}

async function doSignup() {
  const name  = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pass  = document.getElementById('signupPass').value.trim();
  if (!name || !email || !pass) { toast('Fill all fields', 'var(--red)'); return; }
  const btn = document.getElementById('signupBtn');
  btn.textContent = 'Creating...'; btn.disabled = true;
  try {
    const data  = await api('POST', '/auth/signup', { full_name: name, email, password: pass });
    token       = data.token;
    currentUser = data.user;
    localStorage.setItem('notes_token', token);
    localStorage.setItem('notes_user', JSON.stringify(currentUser));
    hideLoginScreen();
    updateUserCard();
    await loadNotes();
    toast('Welcome ' + name + '!', 'var(--green)');
  } catch (err) {
    toast(err.message || 'Signup failed', 'var(--red)');
  } finally { btn.textContent = 'Create account'; btn.disabled = false; }
}

async function doLogout() {
  try { await api('POST', '/auth/logout'); } catch {}
  token = null; currentUser = null; notes = []; activeId = null;
  localStorage.removeItem('notes_token');
  localStorage.removeItem('notes_user');
  document.getElementById('emptyState').style.display   = '';
  document.getElementById('editorScroll').style.display = 'none';
  document.getElementById('editorFooter').style.display = 'none';
  showLoginScreen();
  toast('Logged out', 'var(--text2)');
}

function updateUserCard() {
  if (!currentUser) return;
  const n = document.querySelector('.user-name');
  const p = document.querySelector('.user-plan');
  const a = document.querySelector('.avatar');
  if (n) n.textContent = currentUser.full_name || 'User';
  if (p) p.textContent = (currentUser.plan || 'free') + ' plan';
  if (a) a.textContent = (currentUser.full_name || 'U')[0].toUpperCase();
}

// ════════════════════════════════
// NOTES — BACKEND API
// ════════════════════════════════
async function loadNotes() {
  try {
    const data      = await api('GET', '/notes');
    notes           = data.notes || [];
    try {
      const trashData = await api('GET', '/notes/trash/all');
      const trash     = (trashData.notes || []).map(n => ({ ...n, deleted: true }));
      notes           = [...notes, ...trash];
    } catch {}
    render();
  } catch (err) {
    toast('Failed to load notes', 'var(--red)');
  }
}

async function createNewNote() {
  try {
    const data = await api('POST', '/notes', { title:'', body:'', tags:['Personal'], pinned:false, color:0 });
    notes.unshift({ ...data.note, deleted: false });
    currentFilter = 'all';
    setActiveNav('all');
    render();
    openNote(data.note.id);
    setTimeout(() => document.getElementById('titleInput').focus(), 50);
    toast('New note created', 'var(--green)');
  } catch (err) { toast('Failed to create: ' + err.message, 'var(--red)'); }
}

async function saveNoteToBackend(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  try {
    await api('PUT', `/notes/${id}`, { title: note.title, body: note.body, tags: note.tags, pinned: note.pinned, color: note.color });
    const ind = document.getElementById('saveIndicator');
    if (ind) { ind.classList.add('show'); setTimeout(() => ind.classList.remove('show'), 1800); }
  } catch (err) { toast('Save failed', 'var(--red)'); }
}

async function deleteNote() {
  closeModal();
  if (!activeId) return;
  try {
    await api('DELETE', `/notes/${activeId}`);
    const note = notes.find(n => n.id === activeId);
    if (note) note.deleted = true;
    activeId = null;
    document.getElementById('emptyState').style.display   = '';
    document.getElementById('editorScroll').style.display = 'none';
    document.getElementById('editorFooter').style.display = 'none';
    render();
    toast('Moved to trash', 'var(--red)');
  } catch (err) { toast('Delete failed', 'var(--red)'); }
}

async function restoreNote(id) {
  try {
    await api('PUT', `/notes/${id}/restore`);
    const note = notes.find(n => n.id === id);
    if (note) note.deleted = false;
    render();
    toast('Note restored', 'var(--green)');
  } catch (err) { toast('Restore failed', 'var(--red)'); }
}

// ════════════════════════════════
// RENDER
// ════════════════════════════════
function render() {
  renderTagsList();
  renderNotesList();
  updateCounts();
  renderColorPicker();
}

function renderTagsList() {
  const el = document.getElementById('tagsList');
  if (!el) return;
  el.innerHTML = TAGS_META.map(t => {
    const count = notes.filter(n => (n.tags||[]).includes(t.name) && !n.deleted).length;
    return `<div class="tag-chip" onclick="filterNotes('tag:${t.name}',null)">
      <div class="tag-dot" style="background:${t.color}"></div>${t.name}
      <span style="margin-left:auto;font-size:11px;color:var(--text3)">${count}</span>
    </div>`;
  }).join('');
}

function renderColorPicker() {
  const el = document.getElementById('colorPicker');
  if (!el) return;
  el.innerHTML = NOTE_COLORS.map((c,i) => `
    <div onclick="setNoteColor(${i})" title="${NOTE_COLORS_LABEL[i]}"
      style="width:22px;height:22px;border-radius:50%;background:${c};border:2px solid var(--border2);cursor:pointer;transition:transform 0.15s"
      onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform=''"></div>`).join('');
}

function getFilteredNotes() {
  let list = notes.filter(n => {
    if (currentFilter === 'trash')       return n.deleted;
    if (n.deleted)                        return false;
    if (currentFilter === 'pinned')       return n.pinned;
    if (currentFilter.startsWith('tag:')) return (n.tags||[]).includes(currentFilter.slice(4));
    return true;
  });
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(n => (n.title||'').toLowerCase().includes(q) || stripHtml(n.body||'').toLowerCase().includes(q));
  }
  list.sort((a,b) => sortAsc ? new Date(a.updated_at)-new Date(b.updated_at) : new Date(b.updated_at)-new Date(a.updated_at));
  if (currentFilter === 'all' && !searchQuery) {
    list = [...list.filter(n=>n.pinned), ...list.filter(n=>!n.pinned)];
  }
  return list;
}

function renderNotesList() {
  const list = getFilteredNotes();
  const el   = document.getElementById('notesList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div style="padding:30px 16px;text-align:center;color:var(--text3);font-size:13px"><div style="font-size:28px;margin-bottom:8px;opacity:0.4">◉</div>No notes here yet</div>`;
    return;
  }
  el.innerHTML = list.map(n => {
    const active   = n.id === activeId ? 'active' : '';
    const preview  = stripHtml(n.body||'').slice(0,90);
    const date     = formatDate(n.updated_at||n.created_at);
    const tags     = (n.tags||[]).slice(0,2).map(t=>`<span class="note-tag">${t}</span>`).join('');
    const pin      = n.pinned ? `<span class="note-pinned"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 6L2 7.5M6 1l3 3-1.5 1.5-2-.5-3 3L2 7l3-3-.5-2L6 1z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : '';
    const restore  = n.deleted ? `<button onclick="event.stopPropagation();restoreNote('${n.id}')" style="margin-left:auto;font-size:11px;color:var(--green);background:none;border:none;cursor:pointer;padding:2px 6px">Restore</button>` : '';
    return `<div class="note-card ${active}" onclick="openNote('${n.id}')">
      <div class="note-card-top"><div class="note-card-title">${escHtml(n.title||'Untitled')}</div><div class="note-card-date">${date}</div></div>
      <div class="note-card-preview">${escHtml(preview)}</div>
      <div class="note-card-footer">${tags}${pin}${restore}</div>
    </div>`;
  }).join('');
}

function updateCounts() {
  const ca = document.getElementById('countAll');
  const cp = document.getElementById('countPinned');
  const ct = document.getElementById('countTrash');
  if (ca) ca.textContent = notes.filter(n=>!n.deleted).length;
  if (cp) cp.textContent = notes.filter(n=>n.pinned&&!n.deleted).length;
  if (ct) ct.textContent = notes.filter(n=>n.deleted).length;
}

// ════════════════════════════════
// EDITOR
// ════════════════════════════════
function openNote(id) {
  activeId = id;
  const note = notes.find(n=>n.id===id);
  if (!note) return;
  document.getElementById('emptyState').style.display   = 'none';
  document.getElementById('editorScroll').style.display = '';
  document.getElementById('editorFooter').style.display = '';
  document.getElementById('titleInput').value = note.title||'';
  autoResizeTitle();
  document.getElementById('noteBody').innerHTML = note.body||'';
  document.getElementById('editorTagBadge').textContent = (note.tags&&note.tags[0])||'General';
  document.getElementById('editorDate').textContent = 'Edited '+formatDate(note.updated_at||note.created_at);
  document.getElementById('pinBtn').classList.toggle('active', note.pinned);
  updateStats();
  updateInfoPanel(note);
  renderNotesList();
}

function onTitleChange() {
  if (!activeId) return;
  const note = notes.find(n=>n.id===activeId);
  if (!note) return;
  note.title = document.getElementById('titleInput').value;
  note.updated_at = new Date().toISOString();
  autoResizeTitle();
  scheduleSave();
}

function onBodyChange() {
  if (!activeId) return;
  const note = notes.find(n=>n.id===activeId);
  if (!note) return;
  note.body = document.getElementById('noteBody').innerHTML;
  note.updated_at = new Date().toISOString();
  updateStats();
  scheduleSave();
}

function scheduleSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => { saveNoteToBackend(activeId); renderNotesList(); updateCounts(); }, 800);
}

function updateStats() {
  const body  = stripHtml(document.getElementById('noteBody').innerHTML);
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  document.getElementById('wordCount').textContent = words;
  document.getElementById('charCount').textContent = body.length;
  document.getElementById('readTime').textContent  = Math.max(1,Math.ceil(words/200));
  const iw = document.getElementById('infoWords');
  const ic = document.getElementById('infoChars');
  if (iw) iw.textContent = words;
  if (ic) ic.textContent = body.length;
}

function updateInfoPanel(note) {
  const ic = document.getElementById('infoCreated');
  const im = document.getElementById('infoModified');
  if (ic) ic.textContent = formatDate(note.created_at);
  if (im) im.textContent = formatDate(note.updated_at);
  const body = stripHtml(note.body||'');
  const iw = document.getElementById('infoWords');
  const ich = document.getElementById('infoChars');
  if (iw)  iw.textContent  = body.trim() ? body.trim().split(/\s+/).length : 0;
  if (ich) ich.textContent = body.length;
  const tEl = document.getElementById('infoTagsList');
  if (tEl) tEl.innerHTML = (note.tags||[]).map(t => {
    const meta = TAGS_META.find(m=>m.name===t);
    const dot  = meta ? `<div class="tag-dot" style="background:${meta.color}"></div>` : '';
    return `<div class="tag-edit-chip">${dot}${t}<button onclick="removeTagFromNote('${t}')">×</button></div>`;
  }).join('');
}

async function togglePin() {
  if (!activeId) return;
  const note = notes.find(n=>n.id===activeId);
  if (!note) return;
  note.pinned = !note.pinned;
  document.getElementById('pinBtn').classList.toggle('active', note.pinned);
  renderNotesList(); updateCounts();
  await saveNoteToBackend(activeId);
  toast(note.pinned ? 'Note pinned' : 'Note unpinned', 'var(--accent)');
}

function confirmDelete() { if (!activeId) return; document.getElementById('deleteModal').classList.add('open'); }
function closeModal()    { document.getElementById('deleteModal').classList.remove('open'); }

function exportNote() {
  if (!activeId) return;
  const note = notes.find(n=>n.id===activeId);
  if (!note) return;
  const blob = new Blob([`# ${note.title}\n\n${stripHtml(note.body||'')}`], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (note.title||'note')+'.txt';
  a.click();
  toast('Note exported', 'var(--blue)');
}

async function addTagToNote() {
  if (!activeId) return;
  const note = notes.find(n=>n.id===activeId);
  const remaining = TAGS_META.map(t=>t.name).filter(t=>!(note.tags||[]).includes(t));
  if (!remaining.length) { toast('All tags added','var(--text2)'); return; }
  if (!note.tags) note.tags = [];
  note.tags.push(remaining[0]);
  await saveNoteToBackend(activeId);
  updateInfoPanel(note);
  document.getElementById('editorTagBadge').textContent = note.tags[0];
  renderTagsList(); renderNotesList();
  toast('Tag added: '+remaining[0],'var(--green)');
}

function removeTagFromNote(tag) {
  if (!activeId) return;
  const note = notes.find(n=>n.id===activeId);
  note.tags = (note.tags||[]).filter(t=>t!==tag);
  saveNoteToBackend(activeId);
  updateInfoPanel(note); renderTagsList();
}

async function setNoteColor(i) {
  if (!activeId) return;
  notes.find(n=>n.id===activeId).color = i;
  await saveNoteToBackend(activeId);
  toast('Color updated','var(--text2)');
}

// ════════════════════════════════
// FILTERING
// ════════════════════════════════
function filterNotes(type) {
  currentFilter = type; searchQuery = '';
  const s = document.getElementById('sidebarSearch');
  if (s) s.value = '';
  setActiveNav(type);
  const titles = {all:'All notes',pinned:'Pinned',recent:'Recent',trash:'Trash'};
  const pt = document.getElementById('panelTitle');
  if (pt) pt.textContent = titles[type]||(type.startsWith('tag:')?type.slice(4):'Notes');
  render();
}

function setActiveNav(type) {
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  const map = {all:0,pinned:1,recent:2,trash:3};
  if (map[type]!==undefined) document.querySelectorAll('.nav-item')[map[type]]?.classList.add('active');
}

function setTypeFilter(type, el) {
  document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
}

function handleSearch(val) { searchQuery = val; renderNotesList(); }
function toggleSort() {
  sortAsc = !sortAsc;
  const sl = document.getElementById('sortLabel');
  if (sl) sl.textContent = sortAsc ? 'Oldest' : 'Newest';
  renderNotesList();
}

// ════════════════════════════════
// FORMATTING
// ════════════════════════════════
function execFmt(cmd,val) { document.getElementById('noteBody').focus(); document.execCommand(cmd,false,val||null); onBodyChange(); }
function wrapCode() {
  const sel=window.getSelection(); if(!sel.rangeCount) return;
  const code=document.createElement('code');
  try{sel.getRangeAt(0).surroundContents(code);}catch{}
  onBodyChange();
}
function handleBodyKey(e) {
  if(e.key==='Enter'&&e.shiftKey){e.preventDefault();document.execCommand('insertHTML',false,'<br><br>');}
  if(e.metaKey||e.ctrlKey){
    if(e.key==='s'){e.preventDefault();saveNoteToBackend(activeId);toast('Saved','var(--green)');}
    if(e.key==='b'){e.preventDefault();execFmt('bold');}
    if(e.key==='i'){e.preventDefault();execFmt('italic');}
  }
}
function autoResizeTitle() {
  const el=document.getElementById('titleInput'); if(!el) return;
  el.style.height='auto'; el.style.height=el.scrollHeight+'px';
}

// ════════════════════════════════
// MOBILE
// ════════════════════════════════
function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('mobileOverlay').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('mobileOverlay').classList.remove('open'); }

// ════════════════════════════════
// AI PANEL
// ════════════════════════════════
function getApiKey()      { return localStorage.getItem(AI_KEY_STORAGE)||''; }
function saveApiKey(key)  { localStorage.setItem(AI_KEY_STORAGE,key.trim()); }

function toggleAiPanel() {
  aiPanelOpen = !aiPanelOpen;
  document.getElementById('aiPanel').classList.toggle('open',aiPanelOpen);
  document.getElementById('aiToggleBtn').classList.toggle('active',aiPanelOpen);
  if(aiPanelOpen) renderApiKeyPromptIfNeeded();
}
function closeAiPanel() {
  aiPanelOpen = false;
  document.getElementById('aiPanel').classList.remove('open');
  document.getElementById('aiToggleBtn').classList.remove('active');
}

function switchAiTab(tab) {
  aiActiveTab = tab;
  document.querySelectorAll('.ai-tab').forEach(t=>t.classList.remove('active'));
  document.querySelector(`.ai-tab[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.ai-pane').forEach(p=>p.classList.remove('active'));
  document.getElementById(`aiPane-${tab}`).classList.add('active');
}

function renderApiKeyPromptIfNeeded() {
  const key = getApiKey();
  ['write','summarize','tags','chat'].forEach(tab => {
    const prompt  = document.getElementById(`apiKeyPrompt-${tab}`);
    const content = document.getElementById(`aiContent-${tab}`);
    if (prompt)  prompt.style.display  = key ? 'none' : 'block';
    if (content) content.style.display = key ? 'block' : 'none';
  });
}

function handleSaveKey(tab) {
  const input = document.getElementById(`apiKeyInput-${tab}`);
  const val   = input.value.trim();
  if (!val.startsWith('sk-ant-')) { toast('Key should start with sk-ant-','var(--red)'); return; }
  saveApiKey(val); renderApiKeyPromptIfNeeded(); toast('API key saved','var(--green)');
}

async function callClaude(systemPrompt, userMessage) {
  const key = getApiKey();
  if (!key) throw new Error('No API key');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true' },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1024, system:systemPrompt, messages:[{role:'user',content:userMessage}] })
  });
  if (!res.ok) { const err=await res.json().catch(()=>({})); throw new Error(err?.error?.message||`API error ${res.status}`); }
  const data = await res.json();
  return data.content?.[0]?.text||'';
}

async function callClaudeChat(messages) {
  const key = getApiKey();
  if (!key) throw new Error('No API key');
  let system;
  if (chatSearchMode==='all') {
    const active = notes.filter(n=>!n.deleted);
    const allNotes = active.map((n,i)=>`--- NOTE ${i+1} [${(n.tags||[]).join(', ')}]\nTitle: ${n.title||'Untitled'}\n${stripHtml(n.body||'').slice(0,600)}`).join('\n\n');
    system = `You are a smart personal assistant in a notes app. The user has ${active.length} notes:\n\n${allNotes}\n\nFind specific information from the notes when asked. Be direct and precise.`;
  } else {
    const note = activeId ? notes.find(n=>n.id===activeId) : null;
    system = `You are a writing assistant. Current note: "${note?.title||''}"\n${stripHtml(note?.body||'').slice(0,1200)}`;
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1024,system,messages})
  });
  if (!res.ok) { const err=await res.json().catch(()=>({})); throw new Error(err?.error?.message||`API error ${res.status}`); }
  const data = await res.json();
  return data.content?.[0]?.text||'';
}

function getActiveNoteContext() {
  const note = activeId ? notes.find(n=>n.id===activeId) : null;
  return { title: note?.title||'Untitled', body: note ? stripHtml(note.body||'') : '' };
}

function showAiLoading(id) {
  const el = document.getElementById(id); if(!el) return;
  el.innerHTML = `<div class="ai-loading"><div class="ai-loading-dot"></div><div class="ai-loading-dot"></div><div class="ai-loading-dot"></div><span style="margin-left:4px;font-size:12px;color:var(--text3)">Thinking…</span></div>`;
}

// WRITE TAB
async function runWritingAction(action) {
  if (aiIsLoading) return;
  if (!activeId) { toast('Open a note first','var(--text2)'); return; }
  const note = getActiveNoteContext();
  const context = window.getSelection()?.toString()?.trim() || note.body;
  if (!context) { toast('Write something first','var(--text2)'); return; }
  const prompts = {
    continue:    { s:'Continue the text in the same tone. Output only the continuation.', u:`Continue:\n\n${context}` },
    rephrase:    { s:'Rephrase this text more clearly. Output only the rephrased version.', u:`Rephrase:\n\n${context}` },
    grammar:     { s:'Fix grammar and spelling. Output only the corrected text.', u:`Fix:\n\n${context}` },
    shorten:     { s:'Shorten this text keeping key info. Output only the shortened version.', u:`Shorten:\n\n${context}` },
    expand:      { s:'Expand this text with more detail. Output only the expanded version.', u:`Expand:\n\n${context}` },
    tone_formal: { s:'Rewrite in professional formal tone. Output only the result.', u:`Formalize:\n\n${context}` },
  };
  const {s,u} = prompts[action];
  aiIsLoading = true; showAiLoading('writeResult');
  document.getElementById('writeResult').classList.add('has-content');
  try {
    const result = await callClaude(s,u);
    document.getElementById('writeResult').innerHTML = `
      <div style="white-space:pre-wrap;word-break:break-word">${escHtml(result)}</div>
      <div class="ai-result-actions">
        <button class="ai-result-btn primary" onclick="applyWriteResult(${JSON.stringify(result)})">Insert</button>
        <button class="ai-result-btn" onclick="replaceNoteBody(${JSON.stringify(result)})">Replace</button>
        <button class="ai-result-btn" onclick="copyToClipboard(${JSON.stringify(result)})">Copy</button>
      </div>`;
  } catch(err) {
    document.getElementById('writeResult').innerHTML = `<div class="ai-result-placeholder">Error: ${err.message}</div>`;
  } finally { aiIsLoading = false; }
}

async function runCustomInstruction() {
  if (aiIsLoading) return;
  const instruction = document.getElementById('writeInstruction').value.trim();
  if (!instruction) { toast('Enter an instruction','var(--text2)'); return; }
  if (!activeId) { toast('Open a note first','var(--text2)'); return; }
  const note = getActiveNoteContext();
  aiIsLoading = true;
  document.getElementById('writeSendBtn').disabled = true;
  showAiLoading('writeResult');
  try {
    const result = await callClaude('Follow the instruction precisely. Output only the result.',`Note:\n${note.body}\n\nInstruction: ${instruction}`);
    document.getElementById('writeResult').innerHTML = `
      <div style="white-space:pre-wrap;word-break:break-word">${escHtml(result)}</div>
      <div class="ai-result-actions">
        <button class="ai-result-btn primary" onclick="applyWriteResult(${JSON.stringify(result)})">Insert</button>
        <button class="ai-result-btn" onclick="replaceNoteBody(${JSON.stringify(result)})">Replace</button>
        <button class="ai-result-btn" onclick="copyToClipboard(${JSON.stringify(result)})">Copy</button>
      </div>`;
  } catch(err) {
    document.getElementById('writeResult').innerHTML = `<div class="ai-result-placeholder">Error: ${err.message}</div>`;
  } finally { aiIsLoading = false; document.getElementById('writeSendBtn').disabled = false; }
}

function applyWriteResult(text) {
  const bodyEl = document.getElementById('noteBody'); bodyEl.focus();
  const sel = window.getSelection();
  if (sel&&sel.rangeCount) { sel.getRangeAt(0).collapse(false); document.execCommand('insertText',false,'\n\n'+text); }
  else { bodyEl.innerHTML += '<br><br>'+escHtml(text).replace(/\n/g,'<br>'); }
  onBodyChange(); toast('Inserted','var(--green)');
}
function replaceNoteBody(text) {
  document.getElementById('noteBody').innerHTML = text.replace(/\n/g,'<br>');
  onBodyChange(); toast('Note updated','var(--green)');
}
function copyToClipboard(text) { navigator.clipboard.writeText(text).then(()=>toast('Copied','var(--blue)')); }

// SUMMARIZE TAB
async function runSummarize(mode) {
  if (aiIsLoading) return;
  if (!activeId) { toast('Open a note first','var(--text2)'); return; }
  const note = getActiveNoteContext();
  if (!note.body) { toast('Note is empty','var(--text2)'); return; }
  const prompts = {
    brief:   { s:'Summarize in 2-3 sentences. No preamble.', u:`Note: "${note.title}"\n\n${note.body}` },
    bullets: { s:'Extract key points as bullet list using •. No preamble.', u:`Note: "${note.title}"\n\n${note.body}` },
    tldr:    { s:'Give one-sentence TL;DR. Start directly.', u:`Note: "${note.title}"\n\n${note.body}` },
    outline: { s:'Create structured outline with sections. Plain text. No preamble.', u:`Note: "${note.title}"\n\n${note.body}` },
  };
  const {s,u} = prompts[mode];
  aiIsLoading = true; showAiLoading('summarizeResult');
  document.getElementById('summarizeResult').classList.add('has-content');
  try {
    const result = await callClaude(s,u);
    document.getElementById('summarizeResult').innerHTML = `
      <div style="white-space:pre-wrap;word-break:break-word">${escHtml(result)}</div>
      <div class="ai-result-actions">
        <button class="ai-result-btn primary" onclick="appendSummary(${JSON.stringify(result)})">Append to note</button>
        <button class="ai-result-btn" onclick="copyToClipboard(${JSON.stringify(result)})">Copy</button>
      </div>`;
  } catch(err) {
    document.getElementById('summarizeResult').innerHTML = `<div class="ai-result-placeholder">Error: ${err.message}</div>`;
  } finally { aiIsLoading = false; }
}

function appendSummary(text) {
  document.getElementById('noteBody').innerHTML += `<br><br><hr style="opacity:0.2"><p><em>Summary</em></p><p>${escHtml(text).replace(/\n/g,'<br>')}</p>`;
  onBodyChange(); toast('Summary appended','var(--green)');
}

// TAGS TAB
async function runAutoTag() {
  if (aiIsLoading) return;
  if (!activeId) { toast('Open a note first','var(--text2)'); return; }
  const note = getActiveNoteContext();
  if (!note.body&&!note.title) { toast('Note is empty','var(--text2)'); return; }
  aiIsLoading = true; showAiLoading('tagResult');
  try {
    const available = TAGS_META.map(t=>t.name).join(', ');
    const result = await callClaude(
      `Pick relevant tags from: ${available}. Return ONLY a JSON array like ["Work","Ideas"]. No explanation.`,
      `Title: ${note.title}\nContent: ${note.body}`
    );
    let suggested = [];
    try { suggested = JSON.parse(result.trim().replace(/```json|```/g,'').trim()); } catch {}
    if (!Array.isArray(suggested)) suggested = [];
    const valid = suggested.filter(t=>TAGS_META.find(m=>m.name===t));
    if (!valid.length) { document.getElementById('tagResult').innerHTML = `<div class="ai-result-placeholder">No matching tags found.</div>`; return; }
    document.getElementById('tagResult').innerHTML = `
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">Click to add:</div>
      <div class="ai-tag-chips">${valid.map(t=>{
        const meta=TAGS_META.find(m=>m.name===t);
        return `<div class="ai-tag-chip" onclick="applyTag('${t}')"><div class="tag-dot" style="background:${meta?.color||'#888'};width:7px;height:7px"></div>${t}</div>`;
      }).join('')}</div>
      <div style="margin-top:10px"><button class="ai-result-btn primary" onclick="applyAllTags(${JSON.stringify(valid)})">Add all tags</button></div>`;
    document.getElementById('tagResult').classList.add('has-content');
  } catch(err) {
    document.getElementById('tagResult').innerHTML = `<div class="ai-result-placeholder">Error: ${err.message}</div>`;
  } finally { aiIsLoading = false; }
}

function applyTag(tag) {
  if (!activeId) return;
  const note = notes.find(n=>n.id===activeId); if(!note) return;
  if (!note.tags) note.tags = [];
  if (!note.tags.includes(tag)) {
    note.tags.push(tag); saveNoteToBackend(activeId);
    updateInfoPanel(note); renderTagsList(); renderNotesList();
    toast('Tag added: '+tag,'var(--green)');
  } else { toast(tag+' already added','var(--text2)'); }
}

function applyAllTags(tags) {
  if (!activeId) return;
  const note = notes.find(n=>n.id===activeId); if(!note) return;
  if (!note.tags) note.tags = [];
  let added = 0;
  tags.forEach(t=>{ if(!note.tags.includes(t)){note.tags.push(t);added++;} });
  if (added) { saveNoteToBackend(activeId); updateInfoPanel(note); renderTagsList(); renderNotesList(); toast(`${added} tag(s) added`,'var(--green)'); }
  else { toast('All tags already added','var(--text2)'); }
}

// CHAT TAB
function setChatMode(mode) {
  chatSearchMode = mode;
  document.querySelectorAll('.chat-mode-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(`chatMode-${mode}`).classList.add('active');
  const hint = document.getElementById('chatModeHint');
  const cnt  = notes.filter(n=>!n.deleted).length;
  if (hint) hint.textContent = mode==='all' ? `Searching across all ${cnt} notes` : 'Reading current note only';
}

function renderChatMessages() {
  const el = document.getElementById('chatMessages'); if(!el) return;
  if (!chatHistory.length) {
    el.innerHTML = `<div class="chat-empty">Ask me to find anything across all your notes — bank details, passwords, project info, or any specific data.</div>`;
    return;
  }
  el.innerHTML = chatHistory.map(m=>`
    <div class="chat-msg ${m.role}">
      <div class="chat-msg-label">${m.role==='user'?'You':'Notes AI'}</div>
      <div class="chat-msg-bubble">${escHtml(m.content).replace(/\n/g,'<br>')}</div>
    </div>`).join('');
  el.scrollTop = el.scrollHeight;
}

async function sendChatMessage() {
  if (aiIsLoading) return;
  const input = document.getElementById('chatInput'); if(!input) return;
  const msg   = input.value.trim(); if(!msg) return;
  chatHistory.push({role:'user',content:msg}); input.value = '';
  renderChatMessages();
  aiIsLoading = true;
  document.getElementById('chatSendBtn').disabled = true;
  const loadingEl = document.createElement('div');
  loadingEl.className = 'chat-msg assistant';
  loadingEl.innerHTML = `<div class="chat-msg-label">Notes AI</div><div class="chat-msg-bubble"><div class="ai-loading"><div class="ai-loading-dot"></div><div class="ai-loading-dot"></div><div class="ai-loading-dot"></div></div></div>`;
  document.getElementById('chatMessages').appendChild(loadingEl);
  document.getElementById('chatMessages').scrollTop = 99999;
  try {
    const apiMessages = chatHistory.map(m=>({role:m.role,content:m.content}));
    const reply = await callClaudeChat(apiMessages);
    chatHistory.push({role:'assistant',content:reply});
  } catch(err) { chatHistory.push({role:'assistant',content:'Error: '+err.message}); }
  finally { aiIsLoading=false; document.getElementById('chatSendBtn').disabled=false; renderChatMessages(); }
}

function clearChat() { chatHistory=[]; renderChatMessages(); toast('Chat cleared','var(--text2)'); }
function handleChatKey(e) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatMessage();} }
function useChatStarter(text) { document.getElementById('chatInput').value=text; sendChatMessage(); }

// ════════════════════════════════
// TOAST
// ════════════════════════════════
function toast(msg,color) {
  const c=document.getElementById('toastContainer'); if(!c) return;
  const el=document.createElement('div'); el.className='toast';
  el.innerHTML=`<div class="toast-dot" style="background:${color}"></div>${escHtml(msg)}`;
  c.appendChild(el);
  setTimeout(()=>{el.classList.add('removing');setTimeout(()=>el.remove(),200);},2400);
}

// ════════════════════════════════
// UTILITIES
// ════════════════════════════════
function stripHtml(html) { const d=document.createElement('div');d.innerHTML=html;return d.textContent||''; }
function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatDate(ts) {
  if(!ts) return '—';
  const d=new Date(ts),now=new Date(),diff=now-d;
  if(diff<60000)        return 'just now';
  if(diff<3600000)      return Math.floor(diff/60000)+'m ago';
  if(diff<86400000)     return Math.floor(diff/3600000)+'h ago';
  if(diff<86400000*7)   return Math.floor(diff/86400000)+'d ago';
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

// ════════════════════════════════
// KEYBOARD SHORTCUTS
// ════════════════════════════════
document.addEventListener('keydown', e => {
  if((e.metaKey||e.ctrlKey)&&e.key==='n'){e.preventDefault();createNewNote();}
  if(e.key==='Escape'){closeModal();closeSidebar();}
});

// ════════════════════════════════
// INIT
// ════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const bodyEl = document.getElementById('noteBody');
  if (bodyEl) {
    bodyEl.addEventListener('focus',()=>bodyEl.classList.add('focused'));
    bodyEl.addEventListener('blur', ()=>bodyEl.classList.remove('focused'));
  }
  renderChatMessages();
  checkAuth();
});