// app.js - logic for payroll manager (localStorage)
const DB_KEY = 'payroll_manager_v2_light';

let state = {
  emps: [], // {id,name,phone,salary,remaining,records:[]}
  hjarat: {} // date -> {date,total,fake,reason}
};

function saveState(){ localStorage.setItem(DB_KEY, JSON.stringify(state)); }
function loadState(){ const raw = localStorage.getItem(DB_KEY); if(raw){ try{ state = JSON.parse(raw); }catch(e){ console.error(e); } } renderAll(); }

// Navigation
document.querySelectorAll('.nav-btn').forEach(b=>{
  b.addEventListener('click', ()=> {
    const s = b.getAttribute('data-screen');
    if(s) showScreen(s);
  });
});
function showScreen(id){
  document.querySelectorAll('.screen').forEach(sec=> sec.style.display = (sec.id===id ? 'block' : 'none'));
  if(id==='employees') renderEmpsTable();
  if(id==='transactions') renderTxEmployees();
  if(id==='hjarat') renderHjaratTable();
}

// Employees
document.getElementById('addEmpBtn').addEventListener('click', ()=>{
  const name = document.getElementById('empName').value.trim();
  const phone = document.getElementById('empPhone').value.trim();
  const salary = parseFloat(document.getElementById('empSalary').value) || 0;
  if(!name){ alert('الرجاء إدخال اسم الموظف'); return; }
  const id = Date.now().toString();
  state.emps.push({id,name,phone,salary,remaining:salary,records:[]});
  saveState(); clearEmpForm(); renderEmpsTable(); updateStats();
});

function clearEmpForm(){ document.getElementById('empName').value=''; document.getElementById('empPhone').value=''; document.getElementById('empSalary').value=''; }

function renderEmpsTable(filterStr=''){
  const tbody = document.querySelector('#empsTable tbody');
  tbody.innerHTML = '';
  const q = filterStr.trim().toLowerCase();
  const list = state.emps.filter(e=> !q || e.name.toLowerCase().includes(q) || (e.phone||'').includes(q));
  for(const e of list){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(e.name)}</td>
      <td class="small">${escapeHtml(e.phone)}</td>
      <td>${Number(e.salary).toFixed(2)}</td>
      <td>${Number(e.remaining).toFixed(2)}</td>
      <td>
        <button onclick="openTx('${e.id}')">خصم/مكافأة</button>
        <button class="ghost" onclick="viewRecords('${e.id}')">عرض السجل</button>
        <button class="ghost" onclick="quickWhats('${e.id}')">واتساب</button>
        <button class="ghost" onclick="deleteEmp('${e.id}')">حذف</button>
      </td>`;
    tbody.appendChild(tr);
  }
  document.getElementById('statEmps').textContent = state.emps.length;
}

document.getElementById('searchEmp').addEventListener('input', (e)=> renderEmpsTable(e.target.value));

// Transactions
function renderTxEmployees(){
  const sel = document.getElementById('txEmp');
  sel.innerHTML = '<option value="">-- اختر موظف --</option>';
  for(const e of state.emps) sel.innerHTML += `<option value="${e.id}">${escapeHtml(e.name)} — ${escapeHtml(e.phone||'')}</option>`;
  renderTxTable();
}

document.getElementById('applyTxBtn').addEventListener('click', ()=>{
  const empId = document.getElementById('txEmp').value;
  const amt = parseFloat(document.getElementById('txAmount').value) || 0;
  const type = document.getElementById('txType').value;
  const reason = document.getElementById('txReason').value.trim();
  if(!empId){ alert('اختر الموظف'); return; }
  if(amt<=0){ alert('أدخل مبلغ أكبر من صفر'); return; }
  const emp = state.emps.find(x=>x.id===empId);
  const isReward = type==='reward';
  const now = new Date().toISOString();
  const rec = {date: now, amount: amt, reason, isReward};
  emp.records.push(rec);
  emp.remaining += (isReward ? amt : -amt);
  saveState();
  renderTxTable(); renderEmpsTable(); updateStats(); clearTxForm();
  // open WhatsApp message (encoded)
  const dateStr = new Date().toLocaleString();
  const typeStr = isReward ? 'مكافأة' : 'خصم';
  const msg = encodeURIComponent(`مرحباً ${emp.name}\nتم تسجيل ${typeStr} بمقدار ${amt.toFixed(2)}.\nالسبب: ${reason || '-'}\nالتاريخ: ${dateStr}\nالرصيد الحالي: ${emp.remaining.toFixed(2)}`);
  if(emp.phone) window.open(`https://wa.me/${emp.phone}?text=${msg}`, '_blank');
});

function clearTxForm(){ document.getElementById('txEmp').value=''; document.getElementById('txAmount').value=''; document.getElementById('txType').value='deduct'; document.getElementById('txReason').value=''; }

function renderTxTable(){
  const tbody = document.querySelector('#txTable tbody');
  tbody.innerHTML = '';
  const recs = [];
  for(const e of state.emps){
    for(const r of e.records || []) recs.push({empName:e.name, date:r.date, amount:r.amount, reason:r.reason, isReward:r.isReward});
  }
  recs.sort((a,b)=> b.date.localeCompare(a.date));
  for(const r of recs){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${new Date(r.date).toLocaleString()}</td><td>${escapeHtml(r.empName)}</td><td>${r.isReward?'<span style="color:'+getComputedStyle(document.documentElement).getPropertyValue('--success')+'">مكافأة</span>':'<span style="color:'+getComputedStyle(document.documentElement).getPropertyValue('--danger')+'">خصم</span>'}</td><td>${Number(r.amount).toFixed(2)}</td><td>${escapeHtml(r.reason||'')}</td>`;
    tbody.appendChild(tr);
  }
}

// Employees helpers
function openTx(empId){
  showScreen('transactions');
  setTimeout(()=> { document.getElementById('txEmp').value = empId; }, 120);
}
function viewRecords(empId){
  const emp = state.emps.find(x=>x.id===empId);
  if(!emp) return alert('لم نجد الموظف');
  let html = `سجل ${emp.name}:\n\n`;
  const recs = (emp.records||[]).slice().sort((a,b)=> b.date.localeCompare(a.date));
  if(recs.length===0) return alert('لا يوجد سجلات لهذا الموظف');
  for(const r of recs) html += `${new Date(r.date).toLocaleString()} - ${r.isReward?'مكافأة':'خصم'} - ${r.amount.toFixed(2)} - ${r.reason || '-'}\n`;
  alert(html);
}
function quickWhats(empId){
  const emp = state.emps.find(x=>x.id===empId);
  if(!emp || !emp.phone) return alert('رقم الهاتف غير متوفر');
  const msg = encodeURIComponent(`مرحباً ${emp.name}\nرصيدك الحالي: ${emp.remaining.toFixed(2)}`);
  window.open(`https://wa.me/${emp.phone}?text=${msg}`, '_blank');
}
function deleteEmp(id){
  if(!confirm('هل أنت متأكد من حذف الموظف وسجلاته؟')) return;
  state.emps = state.emps.filter(e=> e.id !== id);
  saveState(); renderEmpsTable(); updateStats();
}

// Hjarat
document.getElementById('hDate').value = new Date().toISOString().slice(0,10);
document.getElementById('saveHBtn').addEventListener('click', ()=>{
  const d = document.getElementById('hDate').value;
  const total = parseInt(document.getElementById('hTotal').value) || 0;
  const fake = parseInt(document.getElementById('hFake').value) || 0;
  const reason = document.getElementById('hReason').value.trim();
  if(!d) return alert('اختر التاريخ');
  state.hjarat[d] = {date:d, total, fake, reason};
  saveState(); renderHjaratTable(); updateStats(); clearHForm();
});
function clearHForm(){ document.getElementById('hTotal').value=''; document.getElementById('hFake').value=''; document.getElementById('hReason').value=''; }

function renderHjaratTable(){
  const tbody = document.querySelector('#hTable tbody'); tbody.innerHTML='';
  const rows = Object.values(state.hjarat).sort((a,b)=> b.date.localeCompare(a.date));
  for(const r of rows){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.date}</td><td>${r.total}</td><td>${r.fake}</td><td>${Math.max(0,r.total-r.fake)}</td><td>${escapeHtml(r.reason||'')}</td>`;
    tbody.appendChild(tr);
  }
}

// Stats and utility
function updateStats(){
  const today = new Date().toISOString().slice(0,10);
  const h = state.hjarat[today] || {total:0,fake:0};
  document.getElementById('statHTotal').textContent = h.total || 0;
  document.getElementById('statHFake').textContent = h.fake || 0;
  document.getElementById('statHNet').textContent = Math.max(0, (h.total||0) - (h.fake||0));
  document.getElementById('statEmps').textContent = state.emps.length;
}

// Export CSV
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const lines = [];
  lines.push(['نوع','الموظف','الهاتف','المبلغ','السبب','التاريخ'].join(','));
  for(const e of state.emps){
    for(const r of (e.records||[])) lines.push([ r.isReward ? 'مكافأة' : 'خصم', `"${e.name}"`, `"${e.phone||''}"`, r.amount, `"${(r.reason||'')}"`, r.date ].join(','));
  }
  const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; document.body.appendChild(a); a.click(); a.remove();
});

// helpers
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function loadDemoIfEmpty(){
  if(state.emps.length===0){
    state.emps.push({id:'u1',name:'احمد علي',phone:'964770100001',salary:300000,remaining:300000,records:[]});
    state.emps.push({id:'u2',name:'سارة محمد',phone:'964770100002',salary:250000,remaining:250000,records:[]});
    saveState();
  }
}

// init
loadState();
loadDemoIfEmpty();
renderAll();

function renderAll(){ renderEmpsTable(); renderTxEmployees(); renderHjaratTable(); updateStats(); }
