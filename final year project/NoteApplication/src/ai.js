/* =============================================
   INK NOTES APP — AI PANEL
   File: ai.js
   ============================================= */

/* ── STATE ── */
const AI_KEY_STORAGE = 'ink_anthropic_key';
let aiPanelOpen   = false;
let aiActiveTab   = 'write';
let chatHistory   = [];
let aiIsLoading   = false;

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-sonnet-4-20250514';

/* ── API KEY MANAGEMENT ── */
function getApiKey() {
  return localStorage.getItem(AI_KEY_STORAGE) || '';
}
function saveApiKey(key) {
  localStorage.setItem(AI_KEY_STORAGE, key.trim());
}

/* ── PANEL TOGGLE ── */
function toggleAiPanel() {
  aiPanelOpen = !aiPanelOpen;
  const panel  = document.getElementById('aiPanel');
  const btn    = document.getElementById('aiToggleBtn');
  panel.classList.toggle('open', aiPanelOpen);
  btn.classList.toggle('active', aiPanelOpen);
  if (aiPanelOpen) renderApiKeyPromptIfNeeded();
}

function closeAiPanel() {
  aiPanelOpen = false;
  document.getElementById('aiPanel').classList.remove('open');
  document.getElementById('aiToggleBtn').classList.remove('active');
}

/* ── TAB SWITCHING ── */
function switchAiTab(tab) {
  aiActiveTab = tab;
  document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.ai-tab[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.ai-pane').forEach(p => p.classList.remove('active'));
  document.getElementById(`aiPane-${tab}`).classList.add('active');
}

/* ── API KEY UI ── */
function renderApiKeyPromptIfNeeded() {
  const key = getApiKey();
  ['write', 'summarize', 'tags', 'chat'].forEach(tab => {
    const prompt = document.getElementById(`apiKeyPrompt-${tab}`);
    if (prompt) prompt.style.display = key ? 'none' : 'block';
    const content = document.getElementById(`aiContent-${tab}`);
    if (content) content.style.display = key ? 'block' : 'none';
  });
}

function handleSaveKey(tab) {
  const input = document.getElementById(`apiKeyInput-${tab}`);
  const val   = input.value.trim();
  if (!val.startsWith('sk-ant-')) {
    showAiError('Key should start with sk-ant-', tab);
    return;
  }
  saveApiKey(val);
  renderApiKeyPromptIfNeeded();
  toast('API key saved', 'var(--green)');
}

/* ── CORE API CALL ── */
async function callClaude(systemPrompt, userMessage, streaming = false) {
  const key = getApiKey();
  if (!key) throw new Error('No API key. Please add your Anthropic key.');

  const body = {
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  };

const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

/* ── CHAT MODE ── */
let chatSearchMode = 'all'; // 'all' | 'current'

function setChatMode(mode) {
  chatSearchMode = mode;
  document.querySelectorAll('.chat-mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`chatMode-${mode}`).classList.add('active');
  const hint = document.getElementById('chatModeHint');
  hint.textContent = mode === 'all'
    ? 'Searching across all ' + notes.filter(n => !n.deleted).length + ' notes'
    : 'Reading current note only';
}

/* ── BUILD ALL-NOTES CONTEXT ── */
function getAllNotesContext() {
  const active = notes.filter(n => !n.deleted);
  if (!active.length) return 'No notes found.';

  return active.map((n, i) => {
    const body = stripHtml(n.body).trim().slice(0, 600);
    const tags  = n.tags.length ? `[${n.tags.join(', ')}]` : '';
    return `--- NOTE ${i + 1} ${tags}\nTitle: ${n.title || 'Untitled'}\n${body}`;
  }).join('\n\n');
}

/* ── CHAT (multi-turn) ── */
async function callClaudeChat(messages) {
  const key = getApiKey();
  if (!key) throw new Error('No API key. Please add your Anthropic key.');

  let system;
  if (chatSearchMode === 'all') {
    const allNotes = getAllNotesContext();
    system = `You are a smart personal assistant built into a notes app called Ink.
The user has ${notes.filter(n => !n.deleted).length} notes. Here is the full content of ALL their notes:

${allNotes}

Your job:
- When asked to find specific data (bank details, passwords, project info, deadlines, names, etc.) — scan ALL notes above and return ONLY the exact relevant information.
- When asked a question, answer using information from their notes if available.
- Be direct and precise. If you find the data, show it clearly. If it's not in any note, say so honestly.
- Never make up information that isn't in the notes.
- Use plain text — no markdown headers. Keep responses concise.`;
  } else {
    const note = getActiveNoteContext();
    system = `You are a smart writing assistant built into a notes app called Ink.
The user is currently working on a note titled: "${note.title}".
Note content: ${note.body.slice(0, 1200)}

Help the user with questions about their note, writing ideas, or anything they need.
Be concise, warm, and genuinely helpful. Use plain text.`;
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}


function getActiveNoteContext() {
  if (!activeId) return { title: 'Untitled', body: '' };
  const note = notes.find(n => n.id === activeId);
  return {
    title: note?.title || 'Untitled',
    body:  note ? stripHtml(note.body) : ''
  };
}

function showAiLoading(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="ai-loading">
      <div class="ai-loading-dot"></div>
      <div class="ai-loading-dot"></div>
      <div class="ai-loading-dot"></div>
      <span style="margin-left:4px;font-size:12px;color:var(--text3)">Thinking…</span>
    </div>`;
}

function showAiError(msg, context) {
  toast('AI error: ' + msg, 'var(--red)');
  console.error('[AI]', msg);
}

/* ════════════════════════════════════════
   TAB 1 — WRITING ASSISTANT
════════════════════════════════════════ */
async function runWritingAction(action) {
  if (aiIsLoading) return;
  if (!activeId) { toast('Open a note first', 'var(--text2)'); return; }

  const note     = getActiveNoteContext();
  const bodyEl   = document.getElementById('noteBody');
  const selected = window.getSelection()?.toString()?.trim() || '';
  const context  = selected || note.body;

  if (!context) { toast('Write something first', 'var(--text2)'); return; }

  const prompts = {
    continue: {
      system: 'You are a writing assistant. Continue the user\'s writing in the same tone, style, and voice. Output only the continuation text — no preamble or explanation.',
      user:   `Continue this text naturally:\n\n${context}`
    },
    rephrase: {
      system: 'You are a writing assistant. Rephrase the given text to be clearer and more engaging, keeping the meaning identical. Output only the rephrased version.',
      user:   `Rephrase this:\n\n${context}`
    },
    grammar: {
      system: 'You are a grammar and style editor. Fix any grammar, spelling, punctuation, and clarity issues. Output only the corrected text with no explanations.',
      user:   `Fix the grammar and style of:\n\n${context}`
    },
    shorten: {
      system: 'You are a writing assistant. Shorten the given text significantly while keeping all key information. Output only the shortened version.',
      user:   `Shorten this text:\n\n${context}`
    },
    expand: {
      system: 'You are a writing assistant. Expand the given text with more detail, examples, and depth. Match the existing tone. Output only the expanded text.',
      user:   `Expand this text with more depth:\n\n${context}`
    },
    tone_formal: {
      system: 'Rewrite the text in a professional, formal tone. Output only the rewritten text.',
      user:   `Make this more formal:\n\n${context}`
    }
  };

  const { system, user } = prompts[action];

  aiIsLoading = true;
  showAiLoading('writeResult');
  document.getElementById('writeResult').classList.add('has-content');

  try {
    const result = await callClaude(system, user);
    renderWriteResult(result, action, selected, bodyEl);
  } catch(err) {
    showAiError(err.message, 'write');
    document.getElementById('writeResult').innerHTML =
      `<div class="ai-result-placeholder">Something went wrong. Check your API key.</div>`;
  } finally {
    aiIsLoading = false;
  }
}

async function runCustomInstruction() {
  if (aiIsLoading) return;
  const instruction = document.getElementById('writeInstruction').value.trim();
  if (!instruction) { toast('Enter an instruction', 'var(--text2)'); return; }
  if (!activeId) { toast('Open a note first', 'var(--text2)'); return; }

  const note    = getActiveNoteContext();
  const context = note.body || '(no content yet)';

  aiIsLoading = true;
  document.getElementById('writeSendBtn').disabled = true;
  showAiLoading('writeResult');
  document.getElementById('writeResult').classList.add('has-content');

  try {
    const result = await callClaude(
      'You are a writing assistant. Follow the user instruction precisely. Output only the result — no preamble.',
      `Note content:\n${context}\n\nInstruction: ${instruction}`
    );
    renderWriteResult(result, 'custom', null, document.getElementById('noteBody'));
  } catch(err) {
    showAiError(err.message, 'write');
    document.getElementById('writeResult').innerHTML =
      `<div class="ai-result-placeholder">Something went wrong. Check your API key.</div>`;
  } finally {
    aiIsLoading = false;
    document.getElementById('writeSendBtn').disabled = false;
  }
}

function renderWriteResult(text, action, selectedText, bodyEl) {
  const el = document.getElementById('writeResult');
  el.innerHTML = `
    <div style="white-space:pre-wrap;word-break:break-word">${escHtml(text)}</div>
    <div class="ai-result-actions">
      <button class="ai-result-btn primary" onclick="applyWriteResult(${JSON.stringify(text)})">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M1.5 6l3 3 5-5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Insert
      </button>
      <button class="ai-result-btn" onclick="replaceNoteBody(${JSON.stringify(text)})">Replace note</button>
      <button class="ai-result-btn" onclick="copyToClipboard(${JSON.stringify(text)})">Copy</button>
    </div>`;
}

function applyWriteResult(text) {
  const bodyEl = document.getElementById('noteBody');
  bodyEl.focus();
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.collapse(false);
    document.execCommand('insertText', false, '\n\n' + text);
  } else {
    bodyEl.innerHTML += '<br><br>' + escHtml(text).replace(/\n/g, '<br>');
  }
  onBodyChange();
  toast('Inserted into note', 'var(--green)');
}

function replaceNoteBody(text) {
  const bodyEl = document.getElementById('noteBody');
  bodyEl.innerHTML = text.replace(/\n/g, '<br>');
  onBodyChange();
  toast('Note updated', 'var(--green)');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard', 'var(--blue)'));
}

/* ════════════════════════════════════════
   TAB 2 — SUMMARIZE
════════════════════════════════════════ */
async function runSummarize(mode) {
  if (aiIsLoading) return;
  if (!activeId) { toast('Open a note first', 'var(--text2)'); return; }

  const note = getActiveNoteContext();
  if (!note.body) { toast('Note is empty', 'var(--text2)'); return; }

  const prompts = {
    brief: {
      system: 'Summarize the given note in 2-3 crisp sentences. Be direct. No preamble.',
      user:   `Note: "${note.title}"\n\n${note.body}`
    },
    bullets: {
      system: 'Extract the key points from the note as a clean bullet list (use • as bullets). No preamble, just the bullets.',
      user:   `Note: "${note.title}"\n\n${note.body}`
    },
    tldr: {
      system: 'Give a single one-sentence TL;DR of the note. Start directly with the summary.',
      user:   `Note: "${note.title}"\n\n${note.body}`
    },
    outline: {
      system: 'Create a structured outline of the note with main sections and sub-points. Use plain indentation (no markdown headers). No preamble.',
      user:   `Note: "${note.title}"\n\n${note.body}`
    }
  };

  const { system, user } = prompts[mode];

  aiIsLoading = true;
  showAiLoading('summarizeResult');
  document.getElementById('summarizeResult').classList.add('has-content');

  try {
    const result = await callClaude(system, user);
    const el = document.getElementById('summarizeResult');
    el.innerHTML = `
      <div style="white-space:pre-wrap;word-break:break-word">${escHtml(result)}</div>
      <div class="ai-result-actions">
        <button class="ai-result-btn primary" onclick="appendSummaryToNote(${JSON.stringify(result)})">
          Append to note
        </button>
        <button class="ai-result-btn" onclick="copyToClipboard(${JSON.stringify(result)})">Copy</button>
      </div>`;
  } catch(err) {
    showAiError(err.message, 'summarize');
    document.getElementById('summarizeResult').innerHTML =
      `<div class="ai-result-placeholder">Something went wrong. Check your API key.</div>`;
  } finally {
    aiIsLoading = false;
  }
}

function appendSummaryToNote(text) {
  const bodyEl = document.getElementById('noteBody');
  bodyEl.innerHTML += `<br><br><hr style="opacity:0.2"><p><em>Summary</em></p><p>${escHtml(text).replace(/\n/g,'<br>')}</p>`;
  onBodyChange();
  toast('Summary appended', 'var(--green)');
}

/* ════════════════════════════════════════
   TAB 3 — AUTO-TAG
════════════════════════════════════════ */
async function runAutoTag() {
  if (aiIsLoading) return;
  if (!activeId) { toast('Open a note first', 'var(--text2)'); return; }

  const note = getActiveNoteContext();
  if (!note.body && !note.title) { toast('Note is empty', 'var(--text2)'); return; }

  const availableTags = TAGS_META.map(t => t.name).join(', ');

  aiIsLoading = true;
  showAiLoading('tagResult');

  try {
    const result = await callClaude(
      `You are a smart tagging system for a notes app. Given a note, pick the most relevant tags from this list: ${availableTags}.
Return ONLY a JSON array of tag names, e.g. ["Work","Ideas"]. No explanation, no markdown, just the JSON array.`,
      `Note title: ${note.title}\n\nContent: ${note.body}`
    );

    let suggested = [];
    try {
      const cleaned = result.trim().replace(/```json|```/g, '').trim();
      suggested = JSON.parse(cleaned);
      if (!Array.isArray(suggested)) suggested = [];
    } catch { suggested = []; }

    renderTagSuggestions(suggested);
  } catch(err) {
    showAiError(err.message, 'tags');
    document.getElementById('tagResult').innerHTML =
      `<div class="ai-result-placeholder">Something went wrong. Check your API key.</div>`;
  } finally {
    aiIsLoading = false;
  }
}

function renderTagSuggestions(tags) {
  const el = document.getElementById('tagResult');
  if (!tags.length) {
    el.innerHTML = `<div class="ai-result-placeholder">No matching tags found.</div>`;
    return;
  }
  const validTags = tags.filter(t => TAGS_META.find(m => m.name === t));
  el.innerHTML = `
    <div style="font-size:12px;color:var(--text3);margin-bottom:8px">Click a tag to add it to the current note:</div>
    <div class="ai-tag-chips">
      ${validTags.map(t => {
        const meta = TAGS_META.find(m => m.name === t);
        const dot  = meta ? `<div class="tag-dot" style="background:${meta.color};width:7px;height:7px"></div>` : '';
        return `<div class="ai-tag-chip" onclick="applyTagSuggestion('${t}')">
          ${dot}${t}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </div>`;
      }).join('')}
    </div>
    <div style="margin-top:10px">
      <button class="ai-result-btn primary" onclick="applyAllTagSuggestions(${JSON.stringify(validTags)})">
        Add all tags
      </button>
    </div>`;
  el.classList.add('has-content');
}

function applyTagSuggestion(tag) {
  if (!activeId) return;
  const note = notes.find(n => n.id === activeId);
  if (!note) return;
  if (!note.tags.includes(tag)) {
    note.tags.push(tag);
    note.modified = Date.now();
    saveNotes();
    updateInfoPanel(note);
    document.getElementById('editorTagBadge').textContent = note.tags[0];
    renderTagsList();
    renderNotesList();
    toast('Tag added: ' + tag, 'var(--green)');
  } else {
    toast(tag + ' already applied', 'var(--text2)');
  }
}

function applyAllTagSuggestions(tags) {
  if (!activeId) return;
  const note = notes.find(n => n.id === activeId);
  if (!note) return;
  let added = 0;
  tags.forEach(tag => {
    if (!note.tags.includes(tag)) { note.tags.push(tag); added++; }
  });
  if (added) {
    note.modified = Date.now();
    saveNotes();
    updateInfoPanel(note);
    document.getElementById('editorTagBadge').textContent = note.tags[0];
    renderTagsList();
    renderNotesList();
    toast(`${added} tag${added > 1 ? 's' : ''} added`, 'var(--green)');
  } else {
    toast('All tags already applied', 'var(--text2)');
  }
}

/* ════════════════════════════════════════
   TAB 4 — AI CHAT
════════════════════════════════════════ */
function renderChatMessages() {
  const el = document.getElementById('chatMessages');
  if (!chatHistory.length) {
    el.innerHTML = `<div class="chat-empty">
      Ask me to find anything across all your notes — bank details, project info, deadlines, or any specific data you've written down.
    </div>`;
    return;
  }
  el.innerHTML = chatHistory.map(m => `
    <div class="chat-msg ${m.role}">
      <div class="chat-msg-label">${m.role === 'user' ? 'You' : 'Ink AI'}</div>
      <div class="chat-msg-bubble">${escHtml(m.content).replace(/\n/g, '<br>')}</div>
    </div>`).join('');
  el.scrollTop = el.scrollHeight;
}

async function sendChatMessage() {
  if (aiIsLoading) return;
  const input = document.getElementById('chatInput');
  const msg   = input.value.trim();
  if (!msg) return;

  chatHistory.push({ role: 'user', content: msg });
  input.value = '';
  renderChatMessages();

  aiIsLoading = true;
  document.getElementById('chatSendBtn').disabled = true;

  const loadingEl = document.createElement('div');
  loadingEl.className = 'chat-msg assistant';
  loadingEl.innerHTML = `
    <div class="chat-msg-label">Ink AI</div>
    <div class="chat-msg-bubble">
      <div class="ai-loading">
        <div class="ai-loading-dot"></div>
        <div class="ai-loading-dot"></div>
        <div class="ai-loading-dot"></div>
      </div>
    </div>`;
  document.getElementById('chatMessages').appendChild(loadingEl);
  document.getElementById('chatMessages').scrollTop = 99999;

  try {
    const apiMessages = chatHistory.map(m => ({ role: m.role, content: m.content }));
    const reply = await callClaudeChat(apiMessages);
    chatHistory.push({ role: 'assistant', content: reply });
  } catch(err) {
    chatHistory.push({ role: 'assistant', content: 'Sorry, something went wrong: ' + err.message });
  } finally {
    aiIsLoading = false;
    document.getElementById('chatSendBtn').disabled = false;
    renderChatMessages();
  }
}

function clearChat() {
  chatHistory = [];
  renderChatMessages();
  toast('Chat cleared', 'var(--text2)');
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

function useChatStarter(text) {
  document.getElementById('chatInput').value = text;
  sendChatMessage();
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  renderChatMessages();
  renderApiKeyPromptIfNeeded();
});