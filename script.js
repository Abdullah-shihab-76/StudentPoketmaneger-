
const $ = id => document.getElementById(id);
const money = n => '৳' + Number(n || 0).toLocaleString('en-BD',{maximumFractionDigits:2});
const today = () => new Date().toISOString().slice(0,10);

const CATS = {
 Income:['Tuition','Scholarship','Family Support','Part-time Job','Other'],
 Expense:['Food','Transport','Education','Rent','Shopping','Mobile/Internet','Health','Other']
};

let transactions = JSON.parse(localStorage.getItem('spm_transactions') || '[]');
let notes = JSON.parse(localStorage.getItem('spm_notes') || '[]');
let settings = JSON.parse(localStorage.getItem('spm_settings') || '{"budget":5000,"goal":10000}');
let selectedColor = '#635bdb';
let editing = null;
let selectedNote = null;
let isAdmin = false;

const save = () => {
 localStorage.setItem('spm_transactions',JSON.stringify(transactions));
 localStorage.setItem('spm_notes',JSON.stringify(notes));
 localStorage.setItem('spm_settings',JSON.stringify(settings));
 render();
};

function toast(msg){
 $('toast').textContent=msg;
 $('toast').style.display='block';
 setTimeout(()=>$('toast').style.display='none',2200);
}

function changeCategory(){
 const type=$('type').value;
 $('category').innerHTML=CATS[type].map(x=>`<option>${x}</option>`).join('');
}
$('type').addEventListener('change',changeCategory);
changeCategory();

$('date').value=today();

function totals(){
 const income=transactions.filter(x=>x.type==='Income').reduce((s,x)=>s+x.amount,0);
 const expense=transactions.filter(x=>x.type==='Expense').reduce((s,x)=>s+x.amount,0);
 return {income,expense,balance:income-expense};
}

function renderDashboard(){
 const t=totals();
 $('monthLabel').textContent=new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'});
 $('sBal').textContent=money(t.balance);
 $('sInc').textContent=money(t.income);
 $('sExp').textContent=money(t.expense);
 $('sRate').textContent=(t.income?Math.round(t.balance/t.income*100):0)+'%';

 const month=today().slice(0,7);
 const monthlyExpense=transactions.filter(x=>x.type==='Expense'&&x.date.startsWith(month)).reduce((s,x)=>s+x.amount,0);
 const bp=settings.budget?Math.round(monthlyExpense/settings.budget*100):0;
 $('bTxt').textContent=money(monthlyExpense)+' / '+money(settings.budget);
 $('bPct').textContent=bp+'%';
 $('bBar').style.width=Math.min(bp,100)+'%';
 $('bHint').textContent=bp>100?'Budget exceeded!':'Remaining: '+money(Math.max(0,settings.budget-monthlyExpense));

 const gp=settings.goal?Math.round(Math.max(0,t.balance)/settings.goal*100):0;
 $('gTxt').textContent=money(Math.max(0,t.balance))+' / '+money(settings.goal);
 $('gPct').textContent=gp+'%';
 $('gBar').style.width=Math.min(gp,100)+'%';
 $('gHint').textContent=gp>=100?'Goal achieved!':'Remaining: '+money(Math.max(0,settings.goal-t.balance));

 const bars=$('bars');
 bars.innerHTML='';
 for(let i=5;i>=0;i--){
  const d=new Date();
  d.setDate(1);
  d.setMonth(d.getMonth()-i);
  const key=d.toISOString().slice(0,7);
  const inc=transactions.filter(x=>x.type==='Income'&&x.date.startsWith(key)).reduce((s,x)=>s+x.amount,0);
  const exp=transactions.filter(x=>x.type==='Expense'&&x.date.startsWith(key)).reduce((s,x)=>s+x.amount,0);
  const max=Math.max(inc,exp,1);
  bars.innerHTML+=`<div class="bar-item"><div class="bar-stack"><i class="income" style="height:${inc/max*100}%"></i><i class="expense" style="height:${exp/max*100}%"></i></div>${d.toLocaleDateString('en',{month:'short'})}</div>`;
 }

 const cats={};
 transactions.filter(x=>x.type==='Expense'&&x.date.startsWith(month)).forEach(x=>cats[x.category]=(cats[x.category]||0)+x.amount);
 $('cats').innerHTML=Object.keys(cats).length?
 Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<p class="row between"><span>${k}</span><b>${money(v)}</b></p>`).join(''):'<p class="lab">No spending yet.</p>';

 $('recent').innerHTML=transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(x=>`<tr><td>${x.date}</td><td>${x.type}</td><td>${x.category}</td><td>${money(x.amount)}</td></tr>`).join('');
}

function renderTransactions(){
 const q=$('q').value.toLowerCase();
 const type=$('fType').value;
 const cat=$('fCat').value;
 const month=$('fMonth').value;

 $('fCat').innerHTML='<option value="">All categories</option>'+[...new Set(Object.values(CATS).flat())].map(c=>`<option>${c}</option>`).join('');
 $('fCat').value=cat;

 const list=transactions.filter(x=>
 (!q||(x.note+' '+x.category).toLowerCase().includes(q))&&
 (!type||x.type===type)&&(!cat||x.category===cat)&&
 (!month||x.date.startsWith(month))
 ).sort((a,b)=>b.date.localeCompare(a.date));

 $('count').textContent=list.length+' transactions';

 $('tbody').innerHTML=list.map(x=>`<tr>
 <td>${x.date}</td><td>${x.type}</td><td>${x.category}</td>
 <td>${escapeHTML(x.note||'-')}</td><td>${money(x.amount)}</td>
 <td><button class="btn g s" onclick="editTransaction('${x.id}')">Edit</button>
 <button class="btn d s" onclick="deleteTransaction('${x.id}')">Delete</button></td>
 </tr>`).join('');
}

function escapeHTML(s){
 return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

$('form').addEventListener('submit',e=>{
 e.preventDefault();
 const amount=Number($('amount').value);
 if(!Number.isFinite(amount)||amount<=0)return toast('Enter a valid amount');

 const item={
 id:editing||crypto.randomUUID(),
 type:$('type').value,
 category:$('category').value,
 amount,
 date:$('date').value,
 note:$('note').value.trim()
 };

 if(editing)transactions=transactions.map(x=>x.id===editing?item:x);
 else transactions.push(item);

 editing=null;
 $('form').reset();
 $('date').value=today();
 $('formTitle').textContent='Add transaction';
 $('cancelEdit').hidden=true;
 changeCategory();
 save();
 toast('Transaction saved');
});

window.editTransaction=id=>{
 const x=transactions.find(t=>t.id===id);
 if(!x)return;
 editing=id;
 $('type').value=x.type;
 changeCategory();
 $('category').value=x.category;
 $('amount').value=x.amount;
 $('date').value=x.date;
 $('note').value=x.note;
 $('formTitle').textContent='Edit transaction';
 $('cancelEdit').hidden=false;
 location.hash='transactions';
};

window.deleteTransaction=id=>{
 if(!confirm('Delete this transaction?'))return;
 transactions=transactions.filter(x=>x.id!==id);
 save();
 toast('Transaction deleted');
};

$('cancelEdit').onclick=()=>{
 editing=null;
 $('form').reset();
 $('date').value=today();
 $('formTitle').textContent='Add transaction';
 $('cancelEdit').hidden=true;
 changeCategory();
};

['q','fType','fCat','fMonth'].forEach(id=>$(id).addEventListener('input',renderTransactions));

$('setBudget').onclick=$('adminBudget').onclick=()=>{
 const n=prompt('Enter monthly budget:',settings.budget);
 if(n!==null&&Number(n)>0){settings.budget=Number(n);save();toast('Budget updated');}
};
$('setGoal').onclick=$('adminGoal').onclick=()=>{
 const n=prompt('Enter savings goal:',settings.goal);
 if(n!==null&&Number(n)>0){settings.goal=Number(n);save();toast('Goal updated');}
};

$('csv').onclick=()=>{
 const rows=[['Date','Type','Category','Amount','Note'],...transactions.map(x=>[x.date,x.type,x.category,x.amount,x.note])];
 download('transactions.csv',rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv');
};

function download(name,content,type){
 const a=document.createElement('a');
 const url=URL.createObjectURL(new Blob([content],{type}));
 a.href=url;a.download=name;a.click();
 URL.revokeObjectURL(url);
}

$('clear').onclick=()=>{
 if(confirm('Delete all transactions?')){transactions=[];save();toast('Transactions cleared');}
};

// NOTES
const colors=['#635bdb','#20a88a','#e05265','#e5a43b','#3b82f6'];
$('sw').innerHTML=colors.map(c=>`<button type="button" style="background:${c}" onclick="selectColor('${c}')"></button>`).join('');

window.selectColor=c=>selectedColor=c;

$('nform').onsubmit=e=>{
 e.preventDefault();
 const item={id:crypto.randomUUID(),title:$('nt').value.trim(),body:$('nb').value.trim(),color:selectedColor,date:today()};
 notes.unshift(item);
 $('nform').reset();
 save();
 toast('Note saved');
};

function renderNotes(){
 const q=$('nq').value.toLowerCase();
 const list=notes.filter(n=>(n.title+' '+n.body).toLowerCase().includes(q));
 $('notesList').innerHTML=list.map(n=>`<div class="note-card" style="border-left-color:${n.color}">
 <h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.body)}</p>
 <small class="lab">${n.date}</small>
 <p><button class="btn d s" onclick="deleteNote('${n.id}')">Delete</button></p>
 </div>`).join('');
}

window.deleteNote=id=>{
 if(!confirm('Delete this note?'))return;
 notes=notes.filter(n=>n.id!==id);
 save();
};
$('nq').oninput=renderNotes;

// ADMIN
const ADMIN_USER='admin';
const ADMIN_PASS='admin123';

$('loginForm').onsubmit=e=>{
 e.preventDefault();
 if($('adminUser').value===ADMIN_USER&&$('adminPass').value===ADMIN_PASS){
  isAdmin=true;
  $('adminLogin').hidden=true;
  $('adminDashboard').hidden=false;
  renderAdmin();
  toast('Admin login successful');
 }else{
  $('loginError').textContent='Incorrect username or password';
 }
};

$('logout').onclick=()=>{
 isAdmin=false;
 $('adminLogin').hidden=false;
 $('adminDashboard').hidden=true;
 $('loginForm').reset();
};

function renderAdmin(){
 if(!isAdmin)return;
 const t=totals();
 $('aCount').textContent=transactions.length;
 $('aIncome').textContent=money(t.income);
 $('aExpense').textContent=money(t.expense);
 $('aNotes').textContent=notes.length;

 $('adminTransactions').innerHTML=transactions.map(x=>`<tr>
 <td>${x.date}</td><td>${x.type}</td><td>${x.category}</td>
 <td>${money(x.amount)}</td>
 <td><button class="btn d s" onclick="adminDelete('${x.id}')">Delete</button></td>
 </tr>`).join('');

 $('adminNotes').innerHTML=notes.map(n=>`<div class="row between">
 <span>${escapeHTML(n.title)}</span>
 <button class="btn d s" onclick="deleteNote('${n.id}')">Delete</button>
 </div>`).join('');
}

window.adminDelete=id=>{
 if(!isAdmin)return;
 if(confirm('Admin: delete this transaction?')){
  transactions=transactions.filter(x=>x.id!==id);
  save();
 }
};

$('backup').onclick=()=>{
 if(!isAdmin)return;
 const data={transactions,notes,settings};
 download('student-pocket-backup.json',JSON.stringify(data,null,2),'application/json');
};

$('restore').onchange=async e=>{
 if(!isAdmin)return;
 const file=e.target.files[0];
 if(!file)return;
 try{
  const data=JSON.parse(await file.text());
  if(!data||!Array.isArray(data.transactions)||!Array.isArray(data.notes)||!data.settings||!Number.isFinite(Number(data.settings.budget))||!Number.isFinite(Number(data.settings.goal)))throw Error();
  if(!confirm('Replace current data with this backup?'))return;
  transactions=data.transactions;
  notes=data.notes;
  settings=data.settings;
  save();
  toast('Backup restored');
 }catch{
  toast('Invalid backup file');
 }
 e.target.value='';
};

$('adminClear').onclick=()=>{
 if(!isAdmin)return;
 if(confirm('WARNING: Delete ALL application data?')){
  transactions=[];notes=[];
  settings={budget:5000,goal:10000};
  save();
  toast('All data deleted');
 }
};

// THEME
$('theme').onclick=()=>{
 document.body.classList.toggle('dark');
 localStorage.setItem('spm_theme',document.body.classList.contains('dark')?'dark':'light');
};
if(localStorage.getItem('spm_theme')==='dark')document.body.classList.add('dark');

// NAVIGATION
function showPage(){
 const page=location.hash.replace('#','')||'dashboard';
 document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==page);
}
window.addEventListener('hashchange',showPage);

function render(){
 renderDashboard();
 renderTransactions();
 renderNotes();
 renderAdmin();
}

showPage();
render();
