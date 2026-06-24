/* =========================================================
   Demo Watches — Admin Panel JS  (admin/admin.js)
   ========================================================= */

// ── Auth guard ──────────────────────────────────────────────
if (localStorage.getItem('dw_admin_auth') !== 'true') {
  location.href = 'login.html';
}

// ── State ───────────────────────────────────────────────────
let allWatches = [];
let allOrders  = [];
let allCoupons = [];
let currentPage = 'dashboard';
let ordFilter   = 'all';

let dashChart, revChart, prodChart, payChart;
let deleteTarget = null; // { type:'watch'|'coupon', id }

// ── Charts already drawn? ───────────────────────────────────
let dashChartDrawn = false;
let analyticsDrawn = false;

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('admin-pill').textContent =
    localStorage.getItem('dw_admin_user') || 'Admin';

  await loadAll();
  renderDashboard();
  renderWatches();
  renderOrders();
  renderCoupons();
});

async function loadAll() {
  [allWatches, allOrders, allCoupons] = await Promise.all([
    DB.getWatches(),
    DB.getOrders(),
    DB.getCoupons(),
  ]);
}

// ── Page Navigation ─────────────────────────────────────────
const PAGE_TITLES = {
  dashboard : 'لوحة التحكم',
  watches   : 'إدارة الساعات',
  orders    : 'الطلبات',
  analytics : 'التحليلات',
  coupons   : 'كوبونات الخصم',
};

function showPage(name) {
  // hide all pages
  document.querySelectorAll('.page-wrap > div[id^="page-"]').forEach(el => {
    el.classList.add('hidden');
  });
  document.getElementById(`page-${name}`).classList.remove('hidden');

  // sidebar active
  document.querySelectorAll('.sb-item').forEach(el => el.classList.remove('on'));
  const item = document.querySelector(`.sb-item[data-page="${name}"]`);
  if (item) item.classList.add('on');

  document.getElementById('page-title').textContent = PAGE_TITLES[name] || name;
  currentPage = name;

  if (name === 'analytics') drawAnalytics();
  if (name === 'dashboard' && !dashChartDrawn) drawDashChart();

  closeSidebar();
}

// ── Sidebar mobile ──────────────────────────────────────────
function toggleSidebar() {
  const sb  = document.getElementById('sidebar');
  const ov  = document.getElementById('sb-overlay');
  const tog = document.getElementById('menu-tog');
  const open = sb.classList.toggle('open');
  ov.style.display = open ? 'block' : 'none';
  tog.textContent  = open ? '✕' : '☰';
}
function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sb-overlay');
  if (sb.classList.contains('open')) {
    sb.classList.remove('open');
    ov.style.display = 'none';
    document.getElementById('menu-tog').textContent = '☰';
  }
}

// ── Logout ──────────────────────────────────────────────────
function doLogout() {
  localStorage.removeItem('dw_admin_auth');
  localStorage.removeItem('dw_admin_user');
  location.href = 'login.html';
}

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const wrap = document.getElementById('toast-wrap');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2800);
  setTimeout(() => t.remove(), 3300);
}

// ═══════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════
function renderDashboard() {
  const completed = allOrders.filter(o => o.status === 'Completed');
  const pending   = allOrders.filter(o => o.status === 'Pending');
  const revenue   = completed.reduce((s, o) => s + (o.total || 0), 0);

  document.getElementById('s-revenue').textContent =
    revenue.toLocaleString('ar-EG') + ' ج.م';
  document.getElementById('s-orders').textContent  = allOrders.length;
  document.getElementById('s-watches').textContent = allWatches.length;
  document.getElementById('s-pending').textContent = pending.length;

  // pending badge
  const badge = document.getElementById('pending-badge');
  if (pending.length > 0) {
    badge.textContent = pending.length;
    badge.classList.remove('hidden');
  }

  renderRecentOrders();
  renderTopProducts();
  drawDashChart();
}

function renderRecentOrders() {
  const tbody = document.getElementById('recent-tbody');
  const recent = [...allOrders].sort((a, b) =>
    new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 6);

  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--muted)">لا توجد طلبات بعد</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(o => `
    <tr>
      <td><code style="color:var(--gold);font-size:.75rem">${o.id?.slice(-8) || '—'}</code></td>
      <td>${o.customer_name || '—'}</td>
      <td>${(o.total||0).toLocaleString('ar-EG')} ج.م</td>
      <td>${payLabel(o.payment_method)}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="color:var(--muted);font-size:.78rem">${fmtDate(o.created_at)}</td>
    </tr>`).join('');
}

function renderTopProducts() {
  const el = document.getElementById('top-list');
  const map = {};
  allOrders.forEach(o => {
    (o.items || []).forEach(it => {
      map[it.name] = (map[it.name] || 0) + (it.qty || 1);
    });
  });
  const top = Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,5);
  if (!top.length) {
    el.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;font-size:.82rem">لا بيانات حتى الآن</p>';
    return;
  }
  const max = top[0][1];
  el.innerHTML = top.map(([name, cnt], i) => `
    <div class="top-prod">
      <span class="rank">${i+1}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:.83rem;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
        <div class="prog-row"><div class="prog-track"><div class="prog-fill" style="width:${Math.round(cnt/max*100)}%"></div></div></div>
      </div>
      <span style="font-size:.78rem;color:var(--gold);white-space:nowrap">${cnt} مبيعة</span>
    </div>`).join('');
}

function drawDashChart() {
  if (dashChartDrawn) return;
  const ctx = document.getElementById('dash-chart');
  if (!ctx) return;
  dashChartDrawn = true;

  const monthly = monthlyRevenue();
  dashChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthly.map(m => m.label),
      datasets: [{
        label: 'الإيرادات (ج.م)',
        data: monthly.map(m => m.rev),
        borderColor: '#D4AF37',
        backgroundColor: 'rgba(212,175,55,.12)',
        borderWidth: 2,
        pointBackgroundColor: '#D4AF37',
        pointRadius: 4,
        tension: 0.4,
        fill: true,
      }]
    },
    options: chartOpts('الإيرادات')
  });
}

// ═══════════════════════════════════════════════════════════
//  WATCHES
// ═══════════════════════════════════════════════════════════
function renderWatches() {
  const tbody = document.getElementById('watches-tbody');
  if (!allWatches.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">لا توجد منتجات — أضف أول ساعة</td></tr>';
    return;
  }
  tbody.innerHTML = allWatches.map(w => `
    <tr>
      <td><img src="${w.image_url||'https://placehold.co/60x60/1A1F3A/D4AF37?text=⌚'}" style="width:50px;height:50px;border-radius:8px;object-fit:cover;border:1px solid rgba(212,175,55,.25)" /></td>
      <td>${w.name_en || w.name || '—'}</td>
      <td>${w.name_ar || '—'}</td>
      <td><span class="badge-info">${w.category || '—'}</span></td>
      <td style="color:var(--gold);font-weight:600">${(w.price||0).toLocaleString('ar-EG')} ج.م</td>
      <td>${w.stock ?? '—'}</td>
      <td>
        <button class="ico-btn edit" onclick="openWatchModal('${w.id}')">✏️</button>
        <button class="ico-btn del"  onclick="confirmDel('watch','${w.id}')">🗑</button>
      </td>
    </tr>`).join('');
}

function openWatchModal(id) {
  const w = id ? allWatches.find(x => x.id === id) : null;
  document.getElementById('watch-modal-title').textContent = w ? 'تعديل الساعة' : 'إضافة ساعة جديدة';
  document.getElementById('w-id').value      = w?.id       || '';
  document.getElementById('w-name').value    = w?.name_en  || w?.name || '';
  document.getElementById('w-name-ar').value = w?.name_ar  || '';
  document.getElementById('w-img').value     = w?.image_url|| '';
  document.getElementById('w-price').value   = w?.price    || '';
  document.getElementById('w-stock').value   = w?.stock    ?? '';
  document.getElementById('w-cat').value     = w?.category || 'Men';
  document.getElementById('w-desc').value    = w?.description    || '';
  document.getElementById('w-desc-ar').value = w?.description_ar || '';
  previewImg(w?.image_url || '');
  document.getElementById('watch-modal').classList.add('open');
}
function closeWatchModal() {
  document.getElementById('watch-modal').classList.remove('open');
}

function previewImg(url) {
  const el = document.getElementById('img-prev');
  if (url) {
    el.innerHTML = `<img src="${url}" style="width:100%;max-height:140px;object-fit:contain;border-radius:8px" onerror="this.parentElement.innerHTML='<div class=img-ph>🖼 رابط غير صالح</div>'" />`;
  } else {
    el.innerHTML = '<div class="img-ph">🖼 معاينة الصورة</div>';
  }
}

async function saveWatch() {
  const id    = document.getElementById('w-id').value;
  const name  = document.getElementById('w-name').value.trim();
  const price = parseFloat(document.getElementById('w-price').value);
  if (!name)       { toast('أدخل اسم الساعة', 'error'); return; }
  if (isNaN(price))  { toast('أدخل سعرًا صحيحًا', 'error'); return; }

  const btn = document.getElementById('save-watch-btn');
  btn.disabled = true; btn.textContent = '⏳ جارٍ الحفظ...';

  const data = {
    name_en      : name,
    name_ar      : document.getElementById('w-name-ar').value.trim(),
    name         : name,
    image_url    : document.getElementById('w-img').value.trim(),
    price,
    stock        : parseInt(document.getElementById('w-stock').value) || 0,
    category     : document.getElementById('w-cat').value,
    description  : document.getElementById('w-desc').value.trim(),
    description_ar: document.getElementById('w-desc-ar').value.trim(),
  };
  if (id) data.id = id;

  try {
    await DB.saveWatch(data);
    allWatches = await DB.getWatches();
    renderWatches();
    renderTopProducts();
    closeWatchModal();
    toast(id ? 'تم تحديث الساعة' : 'تمت إضافة الساعة');
  } catch (e) {
    toast('حدث خطأ — حاول مرة أخرى', 'error');
  }
  btn.disabled = false; btn.textContent = '💾 حفظ';
}

// ═══════════════════════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════════════════════
function renderOrders() {
  const tbody = document.getElementById('orders-tbody');
  const list  = ordFilter === 'all'
    ? allOrders
    : allOrders.filter(o => o.status === ordFilter);

  const sorted = [...list].sort((a,b) =>
    new Date(b.created_at||0) - new Date(a.created_at||0));

  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--muted)">لا توجد طلبات</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(o => `
    <tr>
      <td><code style="color:var(--gold);font-size:.73rem">${o.id?.slice(-8)||'—'}</code></td>
      <td>${o.customer_name||'—'}</td>
      <td style="direction:ltr">${o.customer_phone||'—'}</td>
      <td>${o.city||'—'}</td>
      <td>${payLabel(o.payment_method)}</td>
      <td style="color:var(--gold);font-weight:600">${(o.total||0).toLocaleString('ar-EG')} ج.م</td>
      <td>${statusBadge(o.status)}</td>
      <td style="color:var(--muted);font-size:.76rem">${fmtDate(o.created_at)}</td>
      <td>${o.status === 'Pending'
        ? `<button class="ico-btn done" onclick="markDone('${o.id}')">✅</button>`
        : '<span style="color:var(--muted);font-size:.75rem">مكتمل</span>'}</td>
    </tr>`).join('');
}

function filterOrders(status, btn) {
  ordFilter = status;
  document.querySelectorAll('#ord-tabs .tab-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderOrders();
}

async function markDone(id) {
  try {
    await DB.updateOrderStatus(id, 'Completed');
    const o = allOrders.find(x => x.id === id);
    if (o) o.status = 'Completed';
    renderOrders();
    renderDashboard();
    toast('تم تحديث حالة الطلب إلى مكتمل');
  } catch { toast('حدث خطأ', 'error'); }
}

// ═══════════════════════════════════════════════════════════
//  COUPONS
// ═══════════════════════════════════════════════════════════
function renderCoupons() {
  const grid = document.getElementById('coupon-grid');
  if (!allCoupons.length) {
    grid.innerHTML = '<p style="color:var(--muted)">لا توجد كوبونات — أضف أول كوبون</p>';
    return;
  }
  grid.innerHTML = allCoupons.map(c => `
    <div class="coupon-card">
      <div class="coupon-code">${c.code}</div>
      <div class="coupon-disc">خصم ${(c.discount||0).toLocaleString()} ج.م</div>
      <button class="ico-btn del" onclick="confirmDel('coupon','${c.id}')" style="margin-top:12px">🗑 حذف</button>
    </div>`).join('');
}

function openCouponModal()  { document.getElementById('coupon-modal').classList.add('open'); }
function closeCouponModal() { document.getElementById('coupon-modal').classList.remove('open'); }

async function saveCoupon() {
  const code = document.getElementById('c-code').value.trim().toUpperCase().replace(/\s+/g,'');
  const disc = parseFloat(document.getElementById('c-disc').value);
  if (!code)     { toast('أدخل كود الخصم', 'error'); return; }
  if (isNaN(disc) || disc <= 0) { toast('أدخل قيمة صحيحة', 'error'); return; }

  try {
    await DB.saveCoupon({ code, discount: disc });
    allCoupons = await DB.getCoupons();
    renderCoupons();
    closeCouponModal();
    document.getElementById('c-code').value = '';
    document.getElementById('c-disc').value = '';
    toast('تمت إضافة الكوبون');
  } catch { toast('حدث خطأ', 'error'); }
}

// ═══════════════════════════════════════════════════════════
//  DELETE CONFIRM
// ═══════════════════════════════════════════════════════════
function confirmDel(type, id) {
  deleteTarget = { type, id };
  document.getElementById('del-modal').classList.add('open');
  document.getElementById('confirm-del-btn').onclick = executeDel;
}
function closeDelModal() {
  document.getElementById('del-modal').classList.remove('open');
  deleteTarget = null;
}

async function executeDel() {
  if (!deleteTarget) return;
  const { type, id } = deleteTarget;
  try {
    if (type === 'watch') {
      await DB.deleteWatch(id);
      allWatches = allWatches.filter(w => w.id !== id);
      renderWatches();
      toast('تم حذف الساعة');
    } else if (type === 'coupon') {
      await DB.deleteCoupon(id);
      allCoupons = allCoupons.filter(c => c.id !== id);
      renderCoupons();
      toast('تم حذف الكوبون');
    }
  } catch { toast('حدث خطأ أثناء الحذف', 'error'); }
  closeDelModal();
}

// ═══════════════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════════════
function drawAnalytics() {
  if (analyticsDrawn) return;
  analyticsDrawn = true;

  drawRevChart();
  drawProdChart();
  drawPayChart();
  drawStatusStats();
}

function drawRevChart() {
  const ctx = document.getElementById('rev-chart');
  if (!ctx) return;
  const monthly = monthlyRevenue();
  revChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthly.map(m => m.label),
      datasets: [{
        label: 'الإيرادات (ج.م)',
        data: monthly.map(m => m.rev),
        backgroundColor: 'rgba(212,175,55,.7)',
        borderColor: '#D4AF37',
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: chartOpts('الإيرادات')
  });
}

function drawProdChart() {
  const ctx = document.getElementById('prod-chart');
  if (!ctx) return;
  const map = {};
  allOrders.forEach(o => (o.items||[]).forEach(it => {
    const k = (it.name||'').slice(0,18);
    map[k] = (map[k]||0) + (it.qty||1);
  }));
  const top = Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,6);

  prodChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top.map(([n]) => n) || ['لا بيانات'],
      datasets: [{
        label: 'الكميات المباعة',
        data: top.map(([,v]) => v) || [0],
        backgroundColor: [
          'rgba(212,175,55,.8)','rgba(26,31,58,.9)','rgba(212,175,55,.5)',
          'rgba(26,31,58,.7)','rgba(212,175,55,.3)','rgba(212,175,55,.6)'
        ],
        borderRadius: 6,
      }]
    },
    options: { ...chartOpts('الكميات'), indexAxis: 'y' }
  });
}

function drawPayChart() {
  const ctx = document.getElementById('pay-chart');
  if (!ctx) return;
  const map = {};
  allOrders.forEach(o => {
    const k = o.payment_method || 'غير محدد';
    map[k] = (map[k]||0) + 1;
  });
  const labels = Object.keys(map);
  const data   = Object.values(map);

  payChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map(payLabel),
      datasets: [{
        data,
        backgroundColor: ['#D4AF37','rgba(212,175,55,.5)','rgba(212,175,55,.25)','rgba(212,175,55,.1)'],
        borderColor: '#0A0E27',
        borderWidth: 3,
      }]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#B0B0B0', font: { size: 12 } } }
      },
      responsive: true,
      maintainAspectRatio: false,
    }
  });
}

function drawStatusStats() {
  const el = document.getElementById('status-stats');
  const pending   = allOrders.filter(o => o.status === 'Pending').length;
  const completed = allOrders.filter(o => o.status === 'Completed').length;
  const total     = allOrders.length || 1;

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;padding:8px 0">
      <div>
        <div style="display:flex;justify-content:space-between;font-size:.83rem;margin-bottom:5px">
          <span style="color:var(--muted)">مكتملة</span>
          <span style="color:#4caf50;font-weight:600">${completed}</span>
        </div>
        <div class="prog-track"><div class="prog-fill" style="width:${Math.round(completed/total*100)}%;background:#4caf50"></div></div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:.83rem;margin-bottom:5px">
          <span style="color:var(--muted)">قيد الانتظار</span>
          <span style="color:#ff9800;font-weight:600">${pending}</span>
        </div>
        <div class="prog-track"><div class="prog-fill" style="width:${Math.round(pending/total*100)}%;background:#ff9800"></div></div>
      </div>
      <div style="margin-top:8px;padding-top:12px;border-top:1px solid rgba(212,175,55,.1);text-align:center">
        <div style="font-size:1.4rem;font-weight:700;color:var(--gold)">${total}</div>
        <div style="font-size:.76rem;color:var(--muted)">إجمالي الطلبات</div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════
function monthlyRevenue() {
  const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const map = {};
  allOrders.forEach(o => {
    if (o.status !== 'Completed') return;
    const d = new Date(o.created_at || Date.now());
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    map[k] = (map[k]||0) + (o.total||0);
  });

  // last 6 months
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    result.push({ label: MONTHS[d.getMonth()], rev: map[key]||0 });
  }
  return result;
}

function chartOpts(label) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw.toLocaleString('ar-EG')} ج.م` } }
    },
    scales: {
      x: { ticks: { color: '#B0B0B0', font:{size:11} }, grid: { color: 'rgba(212,175,55,.06)' } },
      y: { ticks: { color: '#B0B0B0', font:{size:11} }, grid: { color: 'rgba(212,175,55,.06)' } },
    }
  };
}

function payLabel(m) {
  const map = { cash:'نقداً', card:'بطاقة', online:'أونلاين', bank:'تحويل بنكي' };
  return map[m] || m || '—';
}

function statusBadge(s) {
  if (s === 'Completed') return '<span class="badge-success">مكتمل</span>';
  if (s === 'Pending')   return '<span class="badge-warn">انتظار</span>';
  return `<span class="badge-info">${s||'—'}</span>`;
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('ar-EG', { day:'2-digit', month:'short', year:'numeric' });
}

// ── Close modals on backdrop click ──────────────────────────
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => {
    if (e.target === ov) ov.classList.remove('open');
  });
});
