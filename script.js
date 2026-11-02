const $ = id => document.getElementById(id);
const money = n => '৳' + Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

const CATS = {
  Income: ['Tuition', 'Scholarship', 'Family Support', 'Part-time Job', 'Other'],
  Expense: ['Food', 'Transport', 'Education', 'Rent', 'Shopping', 'Mobile/Internet', 'Health', 'Other']
};

let transactions = JSON.parse(localStorage.getItem('spm_transactions') || '[]');
let notes = JSON.parse(localStorage.getItem('spm_notes') || '[]');
let settings = JSON.parse(localStorage.getItem('spm_settings') || '{"budget":5000,"goal":10000}');
let selectedColor = '#635bdb';
let editing = null;
let selectedNote = null;
let isAdmin = false;

const save = () => {
  localStorage.setItem('spm_transactions', JSON.stringify(transactions));
  localStorage.setItem('spm_notes', JSON.stringify(notes));
  localStorage.setItem('spm_settings', JSON.stringify(settings));
  render();
};

function toast(msg) {
  const tBox = $('toast');
  if(!tBox) return;
  tBox.textContent = msg;
  tBox.style.display = 'block';
  setTimeout(() => tBox.style.display = 'none', 2200);
}

function changeCategory() {
  const typeEl = $('type');
  const catEl = $('category');
  if (!typeEl || !catEl) return;
  const type = typeEl.value;
  catEl.innerHTML = CATS[type].map(x => `<option>${x}</option>`).join('');
}

const typeEl = $('type');
if (typeEl) {
  typeEl.addEventListener('change', changeCategory);
  changeCategory();
}

const dateEl = $('date');
if (dateEl) dateEl.value = today();

function totals() {
  const income = transactions.filter(x => x.type === 'Income').reduce((s, x) => s + x.amount, 0);
  const expense = transactions.filter(x => x.type === 'Expense').reduce((s, x) => s + x.amount, 0);
  return { income, expense, balance: income - expense };
}

function renderDashboard() {
  const t = totals();
  if ($('monthLabel')) $('monthLabel').textContent = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  if ($('sBal')) $('sBal').textContent = money(t.balance);
  if ($('sInc')) $('sInc').textContent = money(t.income);
  if ($('sExp')) $('sExp').textContent = money(t.expense);
  if ($('sRate')) $('sRate').textContent = (t.income ? Math.round(t.balance / t.income * 100) : 0) + '%';

  const month = today().slice(0, 7);
  const monthlyExpense = transactions.filter(x => x.type === 'Expense' && x.date.startsWith(month)).reduce((s, x) => s + x.amount, 0);
  const bp = settings.budget ? Math.round(monthlyExpense / settings.budget * 100) : 0;
  
  if ($('bTxt')) $('bTxt').textContent = money(monthlyExpense) + ' / ' + money(settings.budget);
  if ($('bPct')) $('bPct').textContent = bp + '%';
  if ($('bBar')) $('bBar').style.width = Math.min(bp, 100) + '%';
  if ($('bHint')) $('bHint').textContent = bp > 100 ? '⚠️ Budget exceeded!' : 'Remaining: ' + money(Math.max(0, settings.budget - monthlyExpense));

  const gp = settings.goal ? Math.round(Math.max(0, t.balance) / settings.goal * 100) : 0;
  if ($('gTxt')) $('gTxt').textContent = money(Math.max(0, t.balance)) + ' / ' + money(settings.goal);
  if ($('gPct')) $('gPct').textContent = gp + '%';
  if ($('gBar')) $('gBar').style.width = Math.min(gp, 100) + '%';
  if ($('gHint')) $('gHint').textContent = gp >= 100 ? '🎉 Goal achieved!' : 'Remaining: ' + money(Math.max(0, settings.goal - t.balance));

  const bars = $('bars');
  if (bars) {
    bars.innerHTML = '';
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const inc = transactions.filter(x => x.type === 'Income' && x.date.startsWith(key)).reduce((s, x) => s + x.amount, 0);
      const exp = transactions.filter(x => x.type === 'Expense' && x.date.startsWith(key)).reduce((s, x) => s + x.amount, 0);
      const max = Math.max(inc, exp, 1);
      bars.innerHTML += `<div class="bar-item"><div class="bar-stack"><i class="income" style="height:${inc / max * 100}%"></i><i class="expense" style="height:${exp / max * 100}%"></i></div>${d.toLocaleDateString('en', { month: 'short' })}</div>`;
    }
  }

  const cats = {};
  transactions.filter(x => x.type === 'Expense' && x.date.startsWith(month)).forEach(x => cats[x.category] = (cats[x.category] || 0) + x.amount);
  if ($('cats')) {
    $('cats').innerHTML = Object.keys(cats).length ?
      Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<p class="row between" style="margin-bottom:0.5rem;"><span>${k}</span><b>${money(v)}</b></p>`).join('') : '<p class="lab">No spending recorded this month.</p>';
  }

  if ($('recent')) {
    $('recent').innerHTML = transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(x => `<tr><td>${x.date}</td><td><span style="color:${x.type==='Income'?'var(--income)':'var(--expense)'}">${x.type}</span></td><td>${x.category}</td><td><b>${money(x.amount)}</b></td></tr>`).join('');
  }
}

function renderTransactions() {
  const qEl = $('q'), fTypeEl = $('fType'), fCatEl = $('fCat'), fMonthEl = $('fMonth');
  if (!qEl || !fTypeEl || !fCatEl || !fMonthEl) return;

  const q = qEl.value.toLowerCase();
  const type = fTypeEl.value;
  const cat = fCatEl.value;
  const month = fMonthEl.value;

  fCatEl.innerHTML = '<option value="">All Categories</option>' + [...new Set(Object.values(CATS).flat())].map(c => `<option>${c}</option>`).join('');
  fCatEl.value = cat;

  const list = transactions.filter(x =>
    (!q || (x.note + ' ' + x.category).toLowerCase().includes(q)) &&
    (!type || x.type === type) && (!cat || x.category === cat) &&
    (!month || x.date.startsWith(month))
  ).sort((a, b) => b.date.localeCompare(a.date));

  if ($('count')) $('count').textContent = list.length + ' transactions found';

  if ($('tbody')) {
    $('tbody').innerHTML = list.map(x => `<tr>
      <td>${x.date}</td>
      <td><span style="color:${x.type==='Income'?'var(--income)':'var(--expense)'}; font-weight:600;">${x.type}</span></td>
      <td>${x.category}</td>
      <td>${escapeHTML(x.note || '-')}</td>
      <td><b>${money(x.amount)}</b></td>
      <td>
        <button class="btn g s" onclick="editTransaction('${x.id}')">Edit</button>
        <button class="btn d s" onclick="deleteTransaction('${x.id}')">Delete</button>
      </td>
    </tr>`).join('');
  }
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const formEl = $('form');
if (formEl) {
  formEl.addEventListener('submit', e => {
    e.preventDefault();
    const amount = Number($('amount').value);
    if (!Number.isFinite(amount) || amount <= 0) return toast('Enter a valid amount');

    const item = {
      id: editing || crypto.randomUUID(),
      type: $('type').value,
      category: $('category').value,
      amount,
      date: $('date').value,
      note: $('note').value.trim()
    };

    if (editing) transactions = transactions.map(x => x.id === editing ? item : x);
    else transactions.push(item);

    editing = null;
    formEl.reset();
    $('date').value = today();
    $('formTitle').textContent = 'Add Transaction';
    $('cancelEdit').hidden = true;
    changeCategory();
    save();
    toast('Transaction saved successfully');
  });
}

window.editTransaction = id => {
  const x = transactions.find(t => t.id === id);
  if (!x) return;
  editing = id;
  $('type').value = x.type;
  changeCategory();
  $('category').value = x.category;
  $('amount').value = x.amount;
  $('date').value = x.date;
  $('note').value = x.note;
  $('formTitle').textContent = 'Edit Transaction';
  $('cancelEdit').hidden = false;
  location.hash = 'transactions';
};

window.deleteTransaction = id => {
  if (!confirm('Are you sure you want to delete this transaction?')) return;
  transactions = transactions.filter(x => x.id !== id);
  save();
  toast('Transaction deleted');
};

const cancelEditEl = $('cancelEdit');
if (cancelEditEl) {
  cancelEditEl.onclick = () => {
    editing = null;
    $('form').reset();
    $('date').value = today();
    $('formTitle').textContent = 'Add Transaction';
    cancelEditEl.hidden = true;
    changeCategory();
  };
}

['q', 'fType', 'fCat', 'fMonth'].forEach(id => {
  if ($(id)) $(id).addEventListener('input', renderTransactions);
});

const handleBudgetClick = () => {
  const n = prompt('Enter monthly budget:', settings.budget);
  if (n !== null && Number(n) > 0) { settings.budget = Number(n); save(); toast('Budget updated'); }
};
if ($('setBudget')) $('setBudget').onclick = handleBudgetClick;
if ($('adminBudget')) $('adminBudget').onclick = handleBudgetClick;

const handleGoalClick = () => {
  const n = prompt('Enter savings goal:', settings.goal);
  if (n !== null && Number(n) > 0) { settings.goal = Number(n); save(); toast('Goal updated'); }
};
if ($('setGoal')) $('setGoal').onclick = handleGoalClick;
if ($('adminGoal')) $('adminGoal').onclick = handleGoalClick;

if ($('csv')) {
  $('csv').onclick = () => {
    const rows = [['Date', 'Type', 'Category', 'Amount', 'Note'], ...transactions.map(x => [x.date, x.type, x.category, x.amount, x.note])];
    download('transactions.csv', rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n'), 'text/csv');
  };
}

function download(name, content, type) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(new Blob([content], { type }));
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

if ($('clear')) {
  $('clear').onclick = () => {
    if (confirm('Delete all transactions?')) { transactions = []; save(); toast('Transactions cleared'); }
  };
}

// NOTES
const colors = ['#635bdb', '#20a88a', '#e05265', '#e5a43b', '#3b82f6'];
if ($('sw')) {
  $('sw').innerHTML = colors.map(c => `<button type="button" style="background:${c}; width:28px; height:28px; border-radius:50%; border:2px solid transparent; cursor:pointer;" onclick="selectColor('${c}')"></button>`).join('');
}

window.selectColor = c => selectedColor = c;

const nform = $('nform');
if (nform) {
  nform.onsubmit = e => {
    e.preventDefault();
    const item = { id: crypto.randomUUID(), title: $('nt').value.trim(), body: $('nb').value.trim(), color: selectedColor, date: today() };
    notes.unshift(item);
    nform.reset();
    save();
    toast('Note saved');
  };
}

function renderNotes() {
  const nq = $('nq');
  if (!nq || !$('notesList')) return;
  const q = nq.value.toLowerCase();
  const list = notes.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(q));
  $('notesList').innerHTML = list.map(n => `<div class="card" style="border-left: 5px solid ${n.color}; position:relative;">
    <h3 style="margin-bottom:0.4rem;">${escapeHTML(n.title)}</h3>
    <p style="color:var(--text-sub); font-size:0.95rem; margin-bottom:0.8rem; white-space:pre-wrap;">${escapeHTML(n.body)}</p>
    <div class="row between" style="align-items:center;">
      <small class="lab">${n.date}</small>
      <button class="btn d s" onclick="deleteNote('${n.id}')">Delete</button>
    </div>
  </div>`).join('');
}

window.deleteNote = id => {
  if (!confirm('Delete this note?')) return;
  notes = notes.filter(n => n.id !== id);
  save();
};
if ($('nq')) $('nq').oninput = renderNotes;

// ADMIN
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

const loginForm = $('loginForm');
if (loginForm) {
  loginForm.onsubmit = e => {
    e.preventDefault();
    if ($('adminUser').value === ADMIN_USER && $('adminPass').value === ADMIN_PASS) {
      isAdmin = true;
      $('adminLogin').hidden = true;
      $('adminDashboard').hidden = false;
      renderAdmin();
      toast('Admin login successful');
    } else {
      $('loginError').textContent = 'Incorrect username or password';
    }
  };
}

const logoutBtn = $('logout');
if (logoutBtn) {
  logoutBtn.onclick = () => {
    isAdmin = false;
    $('adminLogin').hidden = false;
    $('adminDashboard').hidden = true;
    loginForm.reset();
  };
}

function renderAdmin() {
  if (!isAdmin) return;
  const t = totals();
  if ($('aCount')) $('aCount').textContent = transactions.length;
  if ($('aIncome')) $('aIncome').textContent = money(t.income);
  if ($('aExpense')) $('aExpense').textContent = money(t.expense);
  if ($('aNotes')) $('aNotes').textContent = notes.length;

  // Real-time LocalStorage usage gauge calculation
  const totalBytes = new Blob([localStorage.getItem('spm_transactions') || '', localStorage.getItem('spm_notes') || '']).size;
  const percentage = Math.min(Math.round((totalBytes / 5000000) * 100), 100);
  if ($('storageMeter')) $('storageMeter').style.width = Math.max(percentage, 3) + '%';

  if ($('adminTransactions')) {
    $('adminTransactions').innerHTML = transactions.map(x => `<tr>
      <td>${x.date}</td><td>${x.type}</td><td>${x.category}</td>
      <td><b>${money(x.amount)}</b></td>
      <td><button class="btn d s" onclick="adminDelete('${x.id}')">Delete</button></td>
    </tr>`).join('');
  }
}

window.adminDelete = id => {
  if (!isAdmin) return;
  if (confirm('Admin: delete this transaction?')) {
    transactions = transactions.filter(x => x.id !== id);
    save();
  }
};

const backupBtn = $('backup');
if (backupBtn) {
  backupBtn.onclick = () => {
    if (!isAdmin) return;
    const data = { transactions, notes, settings };
    download('student-pocket-backup.json', JSON.stringify(data, null, 2), 'application/json');
  };
}

const restoreInput = $('restore');
if (restoreInput) {
  restoreInput.onchange = async e => {
    if (!isAdmin) return;
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.transactions) || !Array.isArray(data.notes) || !data.settings) throw Error();
      if (!confirm('Replace current data with this backup?')) return;
      transactions = data.transactions;
      notes = data.notes;
      settings = data.settings;
      save();
      toast('Backup restored successfully');
    } catch {
      toast('Invalid backup file');
    }
    e.target.value = '';
  };
}

const adminClearBtn = $('adminClear');
if (adminClearBtn) {
  adminClearBtn.onclick = () => {
    if (!isAdmin) return;
    if (confirm('WARNING: Delete ALL application data?')) {
      transactions = []; notes = [];
      settings = { budget: 5000, goal: 10000 };
      save();
      toast('All data deleted');
    }
  };
}

// THEME
const themeBtn = $('theme');
if (themeBtn) {
  themeBtn.onclick = () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('spm_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  };
}
if (localStorage.getItem('spm_theme') === 'dark') document.body.classList.add('dark');

// NAVIGATION
function showPage() {
  const page = location.hash.replace('#', '') || 'dashboard';
  document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== page);
}
window.addEventListener('hashchange', showPage);

function render() {
  renderDashboard();
  renderTransactions();
  renderNotes();
  renderAdmin();
}

showPage();
render();