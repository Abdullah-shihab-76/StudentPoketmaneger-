(function(){
var CATS={Income:['Pocket Money','Scholarship','Part-time Job','Family Support','Other'],Expense:['Food','Transport','Books','Tuition','Rent','Internet & Mobile','Entertainment','Other']};
var COLORS=['#4f63d8','#0f9d6b','#d98a0b','#d6455d','#8b5cf6'];
var S={tx:[],notes:[],budget:0,goal:0,sort:{k:'date',d:-1}},editId=null,noteColor=COLORS[0];
var $=function(i){return document.getElementById(i)};
function load(){try{var r=localStorage.getItem('spm2');if(r){var d=JSON.parse(r);S.tx=d.tx||[];S.notes=d.notes||[];S.budget=d.budget||0;S.goal=d.goal||0}}catch(e){}}
function save(){try{localStorage.setItem('spm2',JSON.stringify({tx:S.tx,notes:S.notes,budget:S.budget,goal:S.goal}))}catch(e){}}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(n){return '৳'+Math.round(n).toLocaleString('en-IN')}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function ym(s){return s.slice(0,7)}
function toast(m){var t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('on')},2200)}
function fillCats(sel,type,all){sel.innerHTML=(all?'<option value="">All categories</option>':'')+(type?CATS[type]:CATS.Income.concat(CATS.Expense.filter(function(c){return CATS.Income.indexOf(c)<0}))).map(function(c){return '<option>'+esc(c)+'</option>'}).join('')}

/* routing */
function route(){var h=(location.hash||'#dashboard').slice(1);if(['dashboard','transactions','notes'].indexOf(h)<0)h='dashboard';
 ['dashboard','transactions','notes'].forEach(function(v){$('v-'+v).classList.toggle('on',v===h)});
 Array.prototype.forEach.call($('nav').children,function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+h)});window.scrollTo(0,0)}

/* dashboard */
function tot(list,t){return list.filter(function(x){return x.type===t}).reduce(function(s,x){return s+x.amount},0)}
function dash(){
 var inc=tot(S.tx,'Income'),exp=tot(S.tx,'Expense'),bal=inc-exp;
 $('sInc').textContent=money(inc);$('sExp').textContent=money(exp);$('sBal').textContent=money(bal);
 $('sRate').textContent=inc?Math.max(0,Math.round(bal/inc*100))+'%':'0%';
 var cm=ym(today()),mt=S.tx.filter(function(x){return ym(x.date)===cm});
 $('monthLabel').textContent=new Date().toLocaleString('en',{month:'long',year:'numeric'})+' overview';
 var me=tot(mt,'Expense');
 if(S.budget>0){var p=Math.round(me/S.budget*100);$('bTxt').textContent=money(me)+' of '+money(S.budget)+' spent';$('bPct').textContent=p+'%';
  var b=$('bBar');b.style.width=Math.min(100,p)+'%';b.style.background=p>=100?'var(--exp)':p>=80?'var(--warn)':'var(--inc)';
  $('bHint').textContent=p>=100?'You are over budget by '+money(me-S.budget)+'.':p>=80?'Careful: only '+money(S.budget-me)+' left this month.':money(S.budget-me)+' left to spend this month.'}
 else{$('bTxt').textContent='No budget set';$('bPct').textContent='';$('bBar').style.width='0';$('bHint').textContent='Set a monthly limit to track your spending.'}
 if(S.goal>0){var g=Math.max(0,Math.min(100,Math.round(bal/S.goal*100)));$('gTxt').textContent=money(Math.max(0,bal))+' of '+money(S.goal)+' saved';$('gPct').textContent=g+'%';$('gBar').style.width=g+'%';$('gHint').textContent=g>=100?'Goal reached. Well done!':money(S.goal-Math.max(0,bal))+' to go.'}
 else{$('gTxt').textContent='No goal set';$('gPct').textContent='';$('gBar').style.width='0';$('gHint').textContent='Pick a target, like a laptop or exam fee.'}
 var map={};mt.filter(function(x){return x.type==='Expense'}).forEach(function(x){map[x.category]=(map[x.category]||0)+x.amount});
 var ks=Object.keys(map).sort(function(a,b){return map[b]-map[a]}),mx=ks.length?map[ks[0]]:1;
 $('cats').innerHTML=ks.length?ks.map(function(k){return '<div class="cat"><span>'+esc(k)+'</span><div class="prog"><i style="width:'+map[k]/mx*100+'%;background:var(--brand2)"></i></div><b>'+money(map[k])+'</b></div>'}).join(''):'<div class="empty">No expenses this month yet.</div>';
 var ms=[],d=new Date();for(var i=5;i>=0;i--){var t=new Date(d.getFullYear(),d.getMonth()-i,1);ms.push({k:t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0'),l:t.toLocaleString('en',{month:'short'})})}
 var vals=ms.map(function(m){var l=S.tx.filter(function(x){return ym(x.date)===m.k});return{l:m.l,i:tot(l,'Income'),e:tot(l,'Expense')}});
 var vm=Math.max.apply(null,vals.map(function(v){return Math.max(v.i,v.e)}).concat([1]));
 $('bars').innerHTML=vals.map(function(v){return '<div class="bc"><div class="bp"><i title="Income '+money(v.i)+'" style="height:'+v.i/vm*100+'%;background:var(--inc)"></i><i title="Expense '+money(v.e)+'" style="height:'+v.e/vm*100+'%;background:var(--exp)"></i></div><small>'+v.l+'</small></div>'}).join('');
 var rc=S.tx.slice().sort(function(a,b){return b.date.localeCompare(a.date)}).slice(0,5);
 $('recent').innerHTML=rc.length?rc.map(function(x){return '<tr><td><b>'+esc(x.category)+'</b><div class="lab">'+esc(x.note||x.date)+'</div></td><td>'+esc(x.date)+'</td><td class="a '+(x.type==='Income'?'inc':'exp')+'">'+(x.type==='Income'?'+':'−')+money(x.amount)+'</td></tr>'}).join(''):'<tr><td class="empty">No transactions yet. <a href="#transactions">Add your first entry</a> or <a href="#" id="demo">load sample data</a>.</td></tr>';
 var dm=$('demo');if(dm)dm.onclick=function(e){e.preventDefault();sample()}}

/* transactions */
function list(){var q=$('q').value.toLowerCase(),t=$('fType').value,c=$('fCat').value,m=$('fMonth').value;
 var r=S.tx.filter(function(x){return(!t||x.type===t)&&(!c||x.category===c)&&(!m||ym(x.date)===m)&&(!q||(x.note+' '+x.category).toLowerCase().indexOf(q)>=0)});
 var k=S.sort.k,d=S.sort.d;r.sort(function(a,b){var x=a[k],y=b[k];return(x>y?1:x<y?-1:0)*d});
 var inc=tot(r,'Income'),exp=tot(r,'Expense');
 $('count').textContent=r.length+' entries · income '+money(inc)+' · expense '+money(exp);
 $('tbody').innerHTML=r.length?r.map(function(x){return '<tr><td>'+esc(x.date)+'</td><td><span class="chip '+(x.type==='Income'?'i':'e')+'">'+x.type+'</span></td><td>'+esc(x.category)+'</td><td class="n" title="'+esc(x.note)+'">'+esc(x.note||'—')+'</td><td class="a '+(x.type==='Income'?'inc':'exp')+'">'+(x.type==='Income'?'+':'−')+money(x.amount)+'</td><td style="white-space:nowrap;text-align:right"><button class="btn g s" data-e="'+x.id+'">Edit</button> <button class="btn d s" data-d="'+x.id+'">Delete</button></td></tr>'}).join(''):'<tr><td colspan="6" class="empty">No matching transactions.</td></tr>'}
function resetForm(){editId=null;$('form').reset();$('type').value='Income';fillCats($('category'),'Income');$('date').value=today();$('formTitle').textContent='Add transaction';$('saveBtn').textContent='Add entry';$('cancelEdit').hidden=true}
function sample(){var t=new Date(),y=t.getFullYear(),m=t.getMonth(),f=function(o,d){var x=new Date(y,m-o,d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
 var d=[['Income','Pocket Money',8000,0,1,'Monthly allowance'],['Income','Part-time Job',3500,0,5,'Tutoring'],['Expense','Food',2200,0,3,'Canteen and groceries'],['Expense','Transport',900,0,4,'Bus pass'],['Expense','Books',1500,0,6,'Semester textbooks'],['Income','Pocket Money',8000,1,1,'Monthly allowance'],['Expense','Rent',3000,1,2,'Hostel share'],['Expense','Food',2600,1,10,''],['Income','Scholarship',5000,2,8,'Merit stipend'],['Expense','Internet & Mobile',600,2,12,'Data pack'],['Expense','Entertainment',700,3,15,'Movie night'],['Income','Pocket Money',8000,3,1,'']];
 d.forEach(function(r){S.tx.push({id:uid(),type:r[0],category:r[1],amount:r[2],date:f(r[3],r[4]),note:r[5]})});save();all();toast('Sample data loaded')}

/* notes */
function swatches(){$('sw').innerHTML=COLORS.map(function(c){return '<label style="--c:'+c+'" class="'+(c===noteColor?'sel':'')+'" data-c="'+c+'" title="Colour"></label>'}).join('')}
function renderNotes(){var q=$('nq').value.toLowerCase();
 var r=S.notes.filter(function(n){return!q||(n.title+' '+n.body).toLowerCase().indexOf(q)>=0}).sort(function(a,b){return(b.pin?1:0)-(a.pin?1:0)||b.ts-a.ts});
 $('notes').innerHTML=r.length?r.map(function(n){return '<div class="note'+(n.pin?' pin':'')+'" style="--nc:'+n.color+'"><h4>'+(n.pin?'📌 ':'')+esc(n.title)+'</h4><p>'+esc(n.body)+'</p><footer><span>'+new Date(n.ts).toLocaleDateString('en',{day:'numeric',month:'short',year:'numeric'})+'</span><span style="margin-left:auto"></span><button class="btn g s" data-p="'+n.id+'">'+(n.pin?'Unpin':'Pin')+'</button><button class="btn d s" data-nd="'+n.id+'">Delete</button></footer></div>'}).join(''):'<div class="empty" style="grid-column:1/-1">No notes yet. Write your first reminder above.</div>'}

function all(){dash();list();renderNotes()}

/* events */
$('type').onchange=function(){fillCats($('category'),this.value)};
$('form').onsubmit=function(e){e.preventDefault();var a=parseFloat($('amount').value);if(!(a>0)){toast('Enter an amount above zero');return}
 var o={type:$('type').value,category:$('category').value,amount:a,date:$('date').value,note:$('note').value.trim()};
 if(editId){S.tx=S.tx.map(function(x){return x.id===editId?Object.assign({id:editId},o):x});toast('Entry updated')}else{o.id=uid();S.tx.push(o);toast('Entry added')}
 save();resetForm();all()};
$('cancelEdit').onclick=resetForm;
['q','fType','fCat','fMonth'].forEach(function(i){$(i).oninput=list});
$('tbody').onclick=function(e){var b=e.target.closest('button');if(!b)return;
 if(b.dataset.d){if(confirm('Delete this transaction?')){S.tx=S.tx.filter(function(x){return x.id!==b.dataset.d});save();all();toast('Entry deleted')}}
 if(b.dataset.e){var x=S.tx.filter(function(t){return t.id===b.dataset.e})[0];editId=x.id;$('type').value=x.type;fillCats($('category'),x.type);$('category').value=x.category;$('amount').value=x.amount;$('date').value=x.date;$('note').value=x.note;$('formTitle').textContent='Edit transaction';$('saveBtn').textContent='Save changes';$('cancelEdit').hidden=false;window.scrollTo({top:0,behavior:'smooth'})}};
document.querySelector('thead').onclick=function(e){var k=e.target.dataset.k;if(!k)return;S.sort=S.sort.k===k?{k:k,d:-S.sort.d}:{k:k,d:1};list()};
$('clear').onclick=function(){if(S.tx.length&&confirm('Delete all transactions? This cannot be undone.')){S.tx=[];save();all();toast('All transactions cleared')}};
$('csv').onclick=function(){if(!S.tx.length){toast('Nothing to export yet');return}
 var rows=[['Date','Type','Category','Amount','Note']].concat(S.tx.map(function(x){return[x.date,x.type,x.category,x.amount,x.note]}));
 var c=rows.map(function(r){return r.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"'}).join(',')}).join('\n');
 try{var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:'text/csv'}));a.download='pocket-transactions.csv';a.click();toast('CSV exported')}catch(er){toast('Export is not available in this preview')}};
$('setBudget').onclick=function(){var v=prompt('Monthly spending limit (৳):',S.budget||'');if(v===null)return;S.budget=Math.max(0,parseFloat(v)||0);save();dash()};
$('setGoal').onclick=function(){var v=prompt('Savings goal (৳):',S.goal||'');if(v===null)return;S.goal=Math.max(0,parseFloat(v)||0);save();dash()};
$('sw').onclick=function(e){var l=e.target.closest('label');if(l){noteColor=l.dataset.c;swatches()}};
$('nform').onsubmit=function(e){e.preventDefault();S.notes.push({id:uid(),title:$('nt').value.trim(),body:$('nb').value.trim(),color:noteColor,pin:false,ts:Date.now()});save();$('nform').reset();renderNotes();toast('Note saved')};
$('nq').oninput=renderNotes;
$('notes').onclick=function(e){var b=e.target.closest('button');if(!b)return;
 if(b.dataset.p){S.notes=S.notes.map(function(n){if(n.id===b.dataset.p)n.pin=!n.pin;return n});save();renderNotes()}
 if(b.dataset.nd&&confirm('Delete this note?')){S.notes=S.notes.filter(function(n){return n.id!==b.dataset.nd});save();renderNotes();toast('Note deleted')}};
$('theme').onclick=function(){var r=document.documentElement,d=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme:dark)').matches);r.dataset.theme=d?'light':'dark';try{localStorage.setItem('spm2-theme',r.dataset.theme)}catch(e){}};
try{var th=localStorage.getItem('spm2-theme');if(th)document.documentElement.dataset.theme=th}catch(e){}

load();fillCats($('fCat'),null,true);resetForm();swatches();all();route();
window.addEventListener('hashchange',route);
})();
