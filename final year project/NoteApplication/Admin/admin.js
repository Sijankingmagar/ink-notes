
const USERS = Array.from({ length: 60 }, (_, i) => {
  const plans  = ['free','free','free','pro','pro','team'];
  const names  = ['Arjun Sharma','Priya Patel','Rahul Singh','Meera Iyer','Dev Kumar','Anita Roy','Vikram Nair','Sunita Das','Karan Mehta','Pooja Gupta','Amit Joshi','Neha Verma','Rohit Kapoor','Sneha Bhatt','Aakash Malhotra','Divya Rao','Manish Tiwari','Kavya Nair','Siddharth Rao','Riya Sharma','Chris Walker','Sam Johnson','Emma Davis','Liam Brown','Olivia Wilson'];
  const name   = names[i % names.length] + (i > 24 ? ` ${i}` : '');
  const plan   = plans[Math.floor(Math.random() * plans.length)];
  const joined = new Date(Date.now() - Math.random() * 365 * 86400000);
  return {
    id: i + 1,
    name,
    email: name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g,'') + '@email.com',
    plan,
    notes: Math.floor(Math.random() * 200),
    joined: joined.toISOString().split('T')[0],
    status: Math.random() > 0.05 ? 'active' : 'suspended',
    lastActive: Math.floor(Math.random() * 14) + 'd ago',
    storage: (Math.random() * 80).toFixed(1) + ' MB',
    avatar: ['#6ab0e0','#6ec47a','#e8a83a','#c47ae0','#e07a6a','#4db8a0'][i % 6]
  };
});

const REPORTS = [
  { id:1, type:'spam',  user:'anon123@mail.com', detail:'Note contains repeated promotional links', time:'2h ago' },
  { id:2, type:'abuse', user:'user99@mail.com',   detail:'Offensive content targeting another user', time:'3h ago' },
  { id:3, type:'spam',  user:'bot456@mail.com',   detail:'Auto-generated content, 400+ duplicate notes', time:'5h ago' },
  { id:4, type:'abuse', user:'troll88@mail.com',  detail:'Harassment in shared note comments', time:'8h ago' },
  { id:5, type:'spam',  user:'promo22@mail.com',  detail:'Cryptocurrency spam across multiple notes', time:'12h ago' },
  { id:6, type:'abuse', user:'hate77@mail.com',   detail:'Hate speech detected by automated filter', time:'1d ago' },
  { id:7, type:'spam',  user:'farm55@mail.com',   detail:'Scraped content farm, 200+ copied notes', time:'1d ago' },
];

const LOGS = [
  { ts:'2026-03-19 14:32', admin:'Super Admin', action:'suspend', target:'User #892', detail:'Suspended for spam', ip:'192.168.1.1' },
  { ts:'2026-03-19 13:15', admin:'Super Admin', action:'delete',  target:'Note #4421', detail:'Removed abusive content', ip:'192.168.1.1' },
  { ts:'2026-03-19 11:08', admin:'Super Admin', action:'update',  target:'User #234', detail:'Plan upgraded to Pro', ip:'192.168.1.1' },
  { ts:'2026-03-19 10:44', admin:'Super Admin', action:'create',  target:'Coupon INK2026', detail:'20% discount, 3 months', ip:'192.168.1.1' },
  { ts:'2026-03-19 09:22', admin:'Super Admin', action:'update',  target:'Feature flag', detail:'AI summarize → enabled', ip:'192.168.1.1' },
  { ts:'2026-03-18 17:55', admin:'Super Admin', action:'delete',  target:'User #1102', detail:'Account permanently deleted', ip:'192.168.1.1' },
  { ts:'2026-03-18 15:30', admin:'Super Admin', action:'create',  target:'Announcement', detail:'Sent to all 1284 users', ip:'192.168.1.1' },
  { ts:'2026-03-18 14:12', admin:'Super Admin', action:'suspend', target:'User #778', detail:'Suspended for abuse', ip:'192.168.1.1' },
  { ts:'2026-03-18 11:05', admin:'Super Admin', action:'update',  target:'App settings', detail:'Max notes limit → 50', ip:'192.168.1.1' },
  { ts:'2026-03-17 16:40', admin:'Super Admin', action:'delete',  target:'Note #3301', detail:'DMCA takedown request', ip:'192.168.1.1' },
];

const FEATURES = [
  { key:'ai_write',     name:'AI writing assistant', desc:'Continue, rephrase, fix grammar', on:true },
  { key:'ai_chat',      name:'AI chat across notes',  desc:'Search all notes via chat', on:true },
  { key:'ai_tags',      name:'AI auto-tagging',        desc:'Suggest tags automatically', on:true },
  { key:'dark_mode',    name:'Dark mode',               desc:'Toggle dark/light theme', on:true },
  { key:'collab',       name:'Collaboration (beta)',    desc:'Shared notes editing', on:false },
  { key:'offline',      name:'Offline mode',            desc:'Full offline PWA support', on:false },
  { key:'voice_notes',  name:'Voice notes',             desc:'Record audio notes', on:false },
];

const SERVICES = [
  { name:'API server',      status:'ok',   latency:'142ms' },
  { name:'Database',        status:'ok',   latency:'8ms' },
  { name:'Auth service',    status:'ok',   latency:'34ms' },
  { name:'Storage (CDN)',   status:'ok',   latency:'89ms' },
  { name:'AI proxy',        status:'warn', latency:'620ms' },
  { name:'Email service',   status:'ok',   latency:'210ms' },
  { name:'Billing webhook', status:'ok',   latency:'180ms' },
];

const ERRORS = [
  { code:'500', msg:'Internal server error — /api/notes/bulk', time:'2m ago' },
  { code:'429', msg:'Rate limit exceeded — AI endpoint', time:'18m ago' },
  { code:'503', msg:'AI proxy timeout (>10s)', time:'45m ago' },
  { code:'401', msg:'Invalid JWT — /api/user/me', time:'1h ago' },
  { code:'500', msg:'DB connection pool exhausted', time:'3h ago' },
];

/* ── STATE ── */
let currentPage  = 'dashboard';
let userPage     = 1;
const USERS_PER  = 10;
let filteredUsers = [...USERS];
let sortCol      = 'joined';
let sortDir      = -1;
let filteredLogs = [...LOGS];
let charts       = {};

/* ── LOGIN ── */
function doLogin() {
  const email = document.getElementById('loginEmail').value;
  const pass  = document.getElementById('loginPass').value;
  if (!email || !pass) { toast('Enter credentials', '#e8a83a'); return; }
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display    = 'flex';
  initApp();
}

function doLogout() {
  document.getElementById('adminApp').style.display    = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('loginScreen').style.display !== 'none') doLogin();
});

/* ── NAVIGATION ── */
function goTo(page, el) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  if (el) el.classList.add('active');

  const titles = { dashboard:'Dashboard', analytics:'Analytics', users:'Users', billing:'Billing', moderation:'Moderation', health:'System Health', logs:'Audit Logs', settings:'Settings' };
  document.getElementById('pageTitle').textContent   = titles[page] || page;
  document.getElementById('breadcrumb').textContent  = `Admin / ${titles[page] || page}`;

  if (page === 'users')     renderUsersTable();
  if (page === 'billing')   renderBilling();
  if (page === 'logs')      renderLogs();
  if (page === 'moderation') renderModeration();
  if (page === 'health')    renderHealth();
  if (page === 'settings')  renderSettings();
  if (page === 'analytics') initAnalyticsCharts();
}

/* ── INIT ── */
function initApp() {
  updateClock();
  setInterval(updateClock, 1000);
  renderDashboard();
}

function updateClock() {
  const now = new Date();
  document.getElementById('topbarTime').textContent =
    now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

/* ══════════════════════════════
   DASHBOARD
══════════════════════════════ */
function renderDashboard() {
  drawSparklines();
  initGrowthChart('7d');
  initPlanChart();
  renderRecentSignups();
  renderFlagList();
}

function drawSparklines() {
  ['spark1','spark2','spark3','spark4'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const vals = Array.from({length:8}, () => 30 + Math.random() * 70);
    const max = Math.max(...vals), min = Math.min(...vals);
    const w = 120, h = 32;
    const pts = vals.map((v, j) => `${(j/(vals.length-1))*w},${h - ((v-min)/(max-min+1))*h}`).join(' ');
    const colors = ['#6ab0e0','#6ec47a','#e8a83a','#c47ae0'];
    el.innerHTML = `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline points="${pts}" fill="none" stroke="${colors[i]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
    </svg>`;
  });
}

function setChartRange(range, el) {
  document.querySelectorAll('#page-dashboard .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  initGrowthChart(range);
}

function initGrowthChart(range) {
  const ctx = document.getElementById('growthChart');
  if (!ctx) return;
  if (charts.growth) charts.growth.destroy();

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const labels = Array.from({length: days}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    return days <= 7 ? d.toLocaleDateString('en-US',{weekday:'short'}) : d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  });
  const base = 900;
  const users = labels.map((_, i) => Math.round(base + (i / days) * 384 + (Math.random() - 0.5) * 30));
  const notes = labels.map((_, i) => Math.round(30000 + (i / days) * 18000 + (Math.random()-0.5)*2000));

  charts.growth = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'Users', data:users, borderColor:'#e8a83a', backgroundColor:'rgba(232,168,58,0.08)', tension:0.4, pointRadius:0, borderWidth:2, fill:true, yAxisID:'y' },
        { label:'Notes', data:notes, borderColor:'#6ab0e0', backgroundColor:'rgba(106,176,224,0.06)', tension:0.4, pointRadius:0, borderWidth:2, fill:true, yAxisID:'y1' },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false},
      plugins:{ legend:{display:false} },
      scales:{
        x:{ grid:{display:false}, ticks:{font:{size:11},color:'#9e9b94', maxTicksLimit:8} },
        y:{ position:'left', grid:{color:'rgba(0,0,0,0.04)'}, ticks:{font:{size:11},color:'#9e9b94'} },
        y1:{ position:'right', grid:{display:false}, ticks:{font:{size:11},color:'#9e9b94'} }
      }
    }
  });
}

function initPlanChart() {
  const ctx = document.getElementById('planChart');
  if (!ctx) return;
  if (charts.plan) charts.plan.destroy();
  const free = USERS.filter(u=>u.plan==='free').length;
  const pro  = USERS.filter(u=>u.plan==='pro').length;
  const team = USERS.filter(u=>u.plan==='team').length;
  charts.plan = new Chart(ctx, {
    type:'doughnut',
    data:{ labels:['Free','Pro','Team'], datasets:[{ data:[free,pro,team], backgroundColor:['#d3d1c7','#6ab0e0','#e8a83a'], borderWidth:0, hoverOffset:4 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'68%', plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${c.raw} users`}}} }
  });
  const legendEl = document.getElementById('planLegend');
  const colors = ['#d3d1c7','#6ab0e0','#e8a83a'];
  legendEl.innerHTML = [['Free',free],['Pro',pro],['Team',team]].map(([l,n],i)=>
    `<div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div>${l}: ${n}</div>`).join('');
}

function renderRecentSignups() {
  const el = document.getElementById('recentSignups');
  const recent = [...USERS].sort((a,b) => new Date(b.joined)-new Date(a.joined)).slice(0,5);
  el.innerHTML = recent.map(u => `
    <div class="mini-user">
      <div class="mini-avatar" style="background:${u.avatar}">${u.name[0]}</div>
      <div>
        <div class="mini-name">${u.name}</div>
        <div style="font-size:11px;color:var(--text3)">${u.email}</div>
      </div>
      <span class="mini-plan plan-${u.plan}">${u.plan}</span>
      <span class="mini-time">${u.joined}</span>
    </div>`).join('');
}

function renderFlagList() {
  const el = document.getElementById('flagList');
  el.innerHTML = REPORTS.slice(0,4).map(r => `
    <div class="flag-item">
      <div class="flag-type">${r.type.toUpperCase()}</div>
      <div class="flag-note" title="${r.detail}">${r.user} — ${r.detail}</div>
      <button class="flag-action" onclick="goTo('moderation',document.querySelector('[data-page=moderation]'))">Review</button>
    </div>`).join('');
}

/* ══════════════════════════════
   ANALYTICS
══════════════════════════════ */
function initAnalyticsCharts() {
  initDauChart();
  initFeatureChart();
}

function initDauChart() {
  const ctx = document.getElementById('dauChart');
  if (!ctx || charts.dau) return;
  const labels = Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-29+i);return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});});
  const data   = labels.map(()=>Math.round(250+Math.random()*180));
  charts.dau = new Chart(ctx, {
    type:'bar',
    data:{ labels, datasets:[{ label:'DAU', data, backgroundColor:'rgba(232,168,58,0.5)', borderColor:'#e8a83a', borderWidth:1, borderRadius:3 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false},ticks:{font:{size:10},color:'#9e9b94',maxTicksLimit:10}}, y:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{size:11},color:'#9e9b94'}} } }
  });
}

function initFeatureChart() {
  const ctx = document.getElementById('featureChart');
  if (!ctx || charts.feature) return;
  charts.feature = new Chart(ctx, {
    type:'bar',
    data:{
      labels:['Note creation','Rich text editing','AI writing','AI chat','AI summarize','Auto-tagging','Export','Search'],
      datasets:[{ label:'Usage %', data:[100,88,72,61,55,43,38,82], backgroundColor:['#e8a83a','#6ab0e0','#c47ae0','#6ec47a','#e07a6a','#4db8a0','#e8a83a88','#6ab0e088'], borderRadius:4, borderWidth:0 }]
    },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{max:100,grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{size:11},color:'#9e9b94',callback:v=>v+'%'}}, y:{grid:{display:false},ticks:{font:{size:12},color:'#6b6760'}} } }
  });
}

/* ══════════════════════════════
   USERS
══════════════════════════════ */
function renderUsersTable() {
  const start  = (userPage - 1) * USERS_PER;
  const paged  = filteredUsers.slice(start, start + USERS_PER);
  const body   = document.getElementById('usersTableBody');

  body.innerHTML = paged.map(u => `
    <tr>
      <td><input type="checkbox" class="row-check" data-id="${u.id}"/></td>
      <td>
        <div class="user-cell">
          <div class="mini-avatar" style="background:${u.avatar};width:30px;height:30px;font-size:12px">${u.name[0]}</div>
          <div>
            <div class="user-cell-name">${u.name}</div>
            <div class="user-cell-email">${u.email}</div>
          </div>
        </div>
      </td>
      <td><span class="mini-plan plan-${u.plan}">${u.plan}</span></td>
      <td style="font-family:var(--mono);font-size:12.5px">${u.notes}</td>
      <td style="font-size:12.5px">${u.joined}</td>
      <td><span class="status-badge status-${u.status}">${u.status}</span></td>
      <td>
        <button class="tbl-action" onclick="openUserModal(${u.id})">View</button>
        <button class="tbl-action" onclick="toggleUserStatus(${u.id})">${u.status==='active'?'Suspend':'Restore'}</button>
        <button class="tbl-action red" onclick="confirmDeleteUser(${u.id})">Delete</button>
      </td>
    </tr>`).join('');

  document.getElementById('userCount').textContent = `Showing ${start+1}–${Math.min(start+USERS_PER, filteredUsers.length)} of ${filteredUsers.length} users`;
  renderPagination();
}

function renderPagination() {
  const total = Math.ceil(filteredUsers.length / USERS_PER);
  const el    = document.getElementById('userPagination');
  el.innerHTML = Array.from({length: Math.min(total, 6)}, (_, i) => i + 1).map(p =>
    `<button class="page-btn ${p === userPage ? 'active' : ''}" onclick="goUserPage(${p})">${p}</button>`).join('');
}

function goUserPage(p) { userPage = p; renderUsersTable(); }

function filterUsers(val) {
  const q    = (document.getElementById('userSearch').value || '').toLowerCase();
  const plan = document.getElementById('planFilter').value;
  const stat = document.getElementById('statusFilter').value;
  filteredUsers = USERS.filter(u =>
    (!q    || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
    (!plan || u.plan === plan) &&
    (!stat || u.status === stat)
  );
  userPage = 1;
  renderUsersTable();
}

function sortUsers(col) {
  if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; }
  filteredUsers.sort((a, b) => {
    const va = a[col], vb = b[col];
    return typeof va === 'number' ? (va - vb) * sortDir : String(va).localeCompare(String(vb)) * sortDir;
  });
  renderUsersTable();
}

function toggleSelectAll(el) {
  document.querySelectorAll('.row-check').forEach(c => c.checked = el.checked);
}

function openUserModal(id) {
  const u = USERS.find(u => u.id === id);
  if (!u) return;
  document.getElementById('modalUserName').textContent = u.name;
  document.getElementById('modalBody').innerHTML = `
    <div class="modal-row"><span class="modal-key">Email</span><span class="modal-val">${u.email}</span></div>
    <div class="modal-row"><span class="modal-key">Plan</span><span class="modal-val"><span class="mini-plan plan-${u.plan}">${u.plan}</span></span></div>
    <div class="modal-row"><span class="modal-key">Notes created</span><span class="modal-val">${u.notes}</span></div>
    <div class="modal-row"><span class="modal-key">Storage used</span><span class="modal-val">${u.storage}</span></div>
    <div class="modal-row"><span class="modal-key">Joined</span><span class="modal-val">${u.joined}</span></div>
    <div class="modal-row"><span class="modal-key">Last active</span><span class="modal-val">${u.lastActive}</span></div>
    <div class="modal-row"><span class="modal-key">Status</span><span class="modal-val"><span class="status-badge status-${u.status}">${u.status}</span></span></div>
    <div class="modal-actions-row">
      <button class="action-btn" onclick="upgradePlan(${id})">Upgrade to Pro</button>
      <button class="action-btn" onclick="resetPassword(${id})">Reset password</button>
      <button class="action-btn danger" onclick="toggleUserStatus(${id});closeUserModal()">
        ${u.status==='active'?'Suspend':'Restore'} account
      </button>
    </div>`;
  document.getElementById('userModal').classList.add('open');
}

function closeUserModal(e) {
  if (!e || e.target === document.getElementById('userModal')) {
    document.getElementById('userModal').classList.remove('open');
  }
}

function toggleUserStatus(id) {
  const u = USERS.find(u => u.id === id);
  if (!u) return;
  u.status = u.status === 'active' ? 'suspended' : 'active';
  renderUsersTable();
  toast(`User ${u.status === 'suspended' ? 'suspended' : 'restored'}`, u.status === 'suspended' ? '#d63b3b' : '#2d9e5f');
  logAction('suspend', `User #${id}`, `Status set to ${u.status}`);
}

function confirmDeleteUser(id) {
  const u = USERS.find(u => u.id === id);
  showConfirm(`Delete ${u?.name}?`, `This will permanently delete ${u?.email} and all their notes. This cannot be undone.`, () => {
    const idx = USERS.findIndex(u => u.id === id);
    if (idx > -1) { USERS.splice(idx, 1); filteredUsers = filteredUsers.filter(u => u.id !== id); }
    renderUsersTable();
    toast('User deleted', '#d63b3b');
    logAction('delete', `User #${id}`, 'Account permanently deleted');
  });
}

function upgradePlan(id) {
  const u = USERS.find(u => u.id === id);
  if (u) { u.plan = 'pro'; toast(`${u.name} upgraded to Pro`, '#e8a83a'); renderUsersTable(); }
}

function resetPassword(id) {
  toast('Password reset email sent', '#6ab0e0');
}

/* ══════════════════════════════
   BILLING
══════════════════════════════ */
function renderBilling() {
  renderRevenueChart();
  renderTransactions();
}

function renderRevenueChart() {
  const ctx = document.getElementById('revenueChart');
  if (!ctx || charts.revenue) return;
  const months = ['Oct','Nov','Dec','Jan','Feb','Mar'];
  const data   = [1840, 2210, 2640, 3050, 3460, 3840];
  charts.revenue = new Chart(ctx, {
    type:'line',
    data:{ labels:months, datasets:[{ label:'MRR ($)', data, borderColor:'#2d9e5f', backgroundColor:'rgba(45,158,95,0.08)', tension:0.4, pointRadius:4, pointBackgroundColor:'#2d9e5f', borderWidth:2.5, fill:true }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false},ticks:{font:{size:12},color:'#9e9b94'}}, y:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{size:11},color:'#9e9b94',callback:v=>'$'+v.toLocaleString()}} } }
  });
}

function renderTransactions() {
  const el = document.getElementById('transactionList');
  const txns = Array.from({length:8}, (_, i) => ({
    name: USERS[i].name,
    plan: Math.random()>0.3?'Pro':'Team',
    amount: Math.random()>0.3?'$9.00':'$24.00',
    date: `Mar ${19-i}, 2026`
  }));
  el.innerHTML = txns.map(t => `
    <div class="txn-item">
      <div>
        <div style="font-size:13px;font-weight:500;color:var(--text)">${t.name}</div>
        <div class="txn-date">${t.date}</div>
      </div>
      <span class="txn-plan plan-${t.plan.toLowerCase()}">${t.plan}</span>
      <span class="txn-amount">${t.amount}</span>
    </div>`).join('');
}

function generateCoupon() {
  const pct  = document.getElementById('couponPct').value;
  const dur  = document.getElementById('couponDur').value;
  const code = document.getElementById('couponCode').value;
  if (!code) { toast('Enter a code', '#e8a83a'); return; }
  toast(`Coupon ${code} created — ${pct}% off for ${dur} months`, '#2d9e5f');
  logAction('create', `Coupon ${code}`, `${pct}% discount, ${dur} months`);
}

/* ══════════════════════════════
   MODERATION
══════════════════════════════ */
function renderModeration() {
  const el = document.getElementById('reportQueue');
  el.innerHTML = REPORTS.map(r => `
    <div class="report-card" id="report-${r.id}">
      <span class="report-type-badge report-${r.type}">${r.type}</span>
      <div class="report-info">
        <div class="report-user">${r.user}</div>
        <div class="report-detail">${r.detail}</div>
        <div class="report-time">${r.time}</div>
      </div>
      <div class="report-actions">
        <button class="action-btn sm danger" onclick="resolveReport(${r.id},'remove')">Remove</button>
        <button class="action-btn sm" onclick="resolveReport(${r.id},'dismiss')">Dismiss</button>
      </div>
    </div>`).join('');
}

function resolveReport(id, action) {
  const el = document.getElementById(`report-${id}`);
  if (el) el.remove();
  const count = document.querySelectorAll('.report-card').length;
  document.getElementById('openReports').textContent = count;
  document.getElementById('navBadgeMod').textContent = count;
  document.getElementById('flaggedCount').textContent = count + ' pending';
  toast(action === 'remove' ? 'Content removed' : 'Report dismissed', action === 'remove' ? '#d63b3b' : '#6b6760');
  logAction(action === 'remove' ? 'delete' : 'update', `Report #${id}`, action === 'remove' ? 'Content removed' : 'Report dismissed');
}

/* ══════════════════════════════
   SYSTEM HEALTH
══════════════════════════════ */
function renderHealth() {
  renderResponseChart();
  renderServices();
  renderErrors();
}

function renderResponseChart() {
  const ctx = document.getElementById('responseChart');
  if (!ctx || charts.response) return;
  const hours = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);
  const data  = hours.map(()=>Math.round(80+Math.random()*200));
  charts.response = new Chart(ctx, {
    type:'line',
    data:{ labels:hours, datasets:[{ label:'Response (ms)', data, borderColor:'#6ab0e0', backgroundColor:'rgba(106,176,224,0.08)', tension:0.4, pointRadius:0, borderWidth:2, fill:true }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false},ticks:{font:{size:10},color:'#9e9b94',maxTicksLimit:8}}, y:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{font:{size:11},color:'#9e9b94',callback:v=>v+'ms'}} } }
  });
}

function renderServices() {
  const el = document.getElementById('serviceList');
  el.innerHTML = SERVICES.map(s => `
    <div class="service-item">
      <span class="service-name">${s.name}</span>
      <span class="service-status service-${s.status}">
        ${s.status === 'ok' ? '● Operational' : s.status === 'warn' ? '▲ Degraded' : '✕ Down'}
        <span style="font-weight:400;color:var(--text3);margin-left:6px">${s.latency}</span>
      </span>
    </div>`).join('');
}

function renderErrors() {
  const el = document.getElementById('errorList');
  el.innerHTML = ERRORS.map(e => `
    <div class="error-item">
      <span class="error-code">${e.code}</span>
      <span class="error-msg">${e.msg}</span>
      <span class="error-time">${e.time}</span>
    </div>`).join('');
}

/* ══════════════════════════════
   AUDIT LOGS
══════════════════════════════ */
function renderLogs() {
  const body = document.getElementById('logsTableBody');
  body.innerHTML = filteredLogs.map(l => `
    <tr>
      <td style="font-family:var(--mono);font-size:11.5px;color:var(--text3)">${l.ts}</td>
      <td style="font-size:13px;font-weight:500">${l.admin}</td>
      <td><span class="log-action log-${l.action}">${l.action}</span></td>
      <td style="font-size:13px">${l.target}</td>
      <td style="font-size:12px;color:var(--text2)">${l.detail}</td>
      <td style="font-family:var(--mono);font-size:11.5px;color:var(--text3)">${l.ip}</td>
    </tr>`).join('');
  document.getElementById('logCount').textContent = `${filteredLogs.length} log entries`;
}

function filterLogs(val) {
  const q = val.toLowerCase();
  filteredLogs = LOGS.filter(l =>
    l.action.includes(q) || l.target.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q)
  );
  renderLogs();
}

function exportLogs() {
  const csv = ['Timestamp,Admin,Action,Target,Details,IP',
    ...filteredLogs.map(l => `"${l.ts}","${l.admin}","${l.action}","${l.target}","${l.detail}","${l.ip}"`)
  ].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'ink-audit-logs.csv';
  a.click();
  toast('Logs exported', '#6ab0e0');
}

function logAction(action, target, detail) {
  LOGS.unshift({ ts: new Date().toISOString().replace('T',' ').slice(0,16), admin:'Super Admin', action, target, detail, ip:'192.168.1.1' });
  filteredLogs = [...LOGS];
  if (currentPage === 'logs') renderLogs();
}

/* ══════════════════════════════
   SETTINGS
══════════════════════════════ */
function renderSettings() {
  const el = document.getElementById('flagToggles');
  el.innerHTML = FEATURES.map(f => `
    <div class="flag-row">
      <div class="flag-row-info">
        <div class="flag-row-name">${f.name}</div>
        <div class="flag-row-desc">${f.desc}</div>
      </div>
      <label class="toggle-wrap">
        <input type="checkbox" ${f.on?'checked':''} onchange="toggleFeature('${f.key}',this.checked)"/>
        <div class="toggle-track"></div>
        <div class="toggle-thumb"></div>
      </label>
    </div>`).join('');
}

function toggleFeature(key, val) {
  const f = FEATURES.find(f => f.key === key);
  if (f) { f.on = val; toast(`${f.name} ${val?'enabled':'disabled'}`, val?'#2d9e5f':'#6b6760'); logAction('update', 'Feature flag', `${f.name} → ${val?'enabled':'disabled'}`); }
}

function saveSettings() {
  toast('Settings saved', '#2d9e5f');
  logAction('update', 'App settings', 'Configuration updated');
}

function sendAnnouncement() {
  const title = document.getElementById('announceTitle').value;
  const msg   = document.getElementById('announceMsg').value;
  const to    = document.getElementById('announceTo').value;
  if (!title || !msg) { toast('Fill in title and message', '#e8a83a'); return; }
  toast(`Announcement sent to ${to}`, '#2d9e5f');
  logAction('create', 'Announcement', `"${title}" sent to ${to}`);
  document.getElementById('announceTitle').value = '';
  document.getElementById('announceMsg').value   = '';
}

let maintenanceOn = false;
function dangerAction(type) {
  const msgs = {
    purge: { title:'Purge trash notes?', msg:'This will permanently delete all trashed notes older than 30 days across all users. This cannot be undone.', fn:()=>{ toast('Trash purged', '#d63b3b'); logAction('delete','Trash notes','Purged all notes older than 30 days'); } },
    maintenance: { title: maintenanceOn ? 'Disable maintenance?' : 'Enable maintenance?', msg: maintenanceOn ? 'The app will be accessible to all users again.' : 'All users will be redirected to a maintenance page until you disable it.', fn:()=>{ maintenanceOn=!maintenanceOn; document.getElementById('maintBtn').textContent=maintenanceOn?'Disable':'Enable'; toast(maintenanceOn?'Maintenance mode ON':'Maintenance mode OFF', maintenanceOn?'#d63b3b':'#2d9e5f'); logAction('update','App','Maintenance mode '+(maintenanceOn?'enabled':'disabled')); } },
    reset: { title:'Reset analytics?', msg:'All cached analytics data will be cleared and rebuilt. Charts may be empty for a few minutes.', fn:()=>{ toast('Analytics reset', '#e8a83a'); logAction('update','Analytics','Cache cleared and rebuilt'); } }
  };
  const { title, msg, fn } = msgs[type];
  showConfirm(title, msg, fn);
}

/* ── CONFIRM MODAL ── */
function showConfirm(title, msg, fn) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent   = msg;
  document.getElementById('confirmOkBtn').onclick = () => { fn(); closeConfirm(); };
  document.getElementById('confirmModal').classList.add('open');
}
function closeConfirm(e) {
  if (!e || e.target === document.getElementById('confirmModal')) {
    document.getElementById('confirmModal').classList.remove('open');
  }
}

/* ── TOAST ── */
function toast(msg, color) {
  const c  = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="toast-dot" style="background:${color}"></div>${msg}`;
  c.appendChild(el);
  setTimeout(() => { el.classList.add('removing'); setTimeout(()=>el.remove(), 180); }, 3000);
}