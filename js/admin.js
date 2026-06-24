/* ============================================================
   DEMO WATCHES — Admin Dashboard Logic (Galaxy Theme)
   ============================================================ */

// ── Auth Guard ─────────────────────────────────────────────
if (localStorage.getItem('dw_admin_auth') !== 'true') {
  window.location.href = 'login.html';
}

// ── State ──────────────────────────────────────────────────
let allWatches = [];
let allOrders  = [];
let allCoupons = [];
let salesChart    = null;
let revenueChart  = null;
let productsChart = null;
let paymentChart  = null;
let currentOrderFilter = 'all';
let deleteCallback = null;
let activePage = 'dashboard';

const PAGE_TITLES = {
  dashboard: 'لوحة التحكم',
  watches:   'إدارة الساعات',
  orders:    'الطلبات',
  analytics: 'التحليلات',
  coupons:   'كوبونات الخصم'
};

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();

  const user = localStorage.getItem('dw_admin_user') || 'Admin';
  document.getElementById('admin-user-tag').textContent = user;
  document.getElementById('chart-year').textContent = new Date().getFullYear();

  await loadAll();
  showPage('dashboard');
});

async function loadAll() {
  try {
    [allWatches, allOrders, allCoupons] = await Promise.all([
      DB.getWatches(),
      DB.getOrders(),
      DB.getCoupons()
    ]);
    updatePendingBadge();
  } catch (e) {
    showToast('خطأ في تحميل البيانات', 'error');
  }
}

// ── Navigation ─────────────────────────────────────────────
function showPage(page) {
  // hide all
  document.querySelectorAll('[id^="page-"]').forEach(el => el.classList.add('hidden'));
  document.getElementById(`page-${page}`).classList.remove('hidden');

  // sidebar active
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  document.getElementById('page-title').textContent = PAGE_TITLES[page] || page;
  activePage = page;
  closeSidebar();

  // render page
  loadAll().then(() => {
    if (page === 'dashboard') renderDashboard();
    if (page === 'watches')   renderWatches();
    if (page === 'orders')    renderOrders(currentOrderFilter);
    if (page === 'analytics') renderAnalytics();
    if (page === 'coupons')   renderCoupons();
  });
}

// ── Sidebar ────────────────────────────────────────────────
function toggleSidebar() {
  const s = document.getElementById('sidebar');
  const o = document.getElementById('sidebar-overlay');
  const open = s.classList.toggle('open');
  o.style.display = open ? 'block' : 'none';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').style.display = 'none';
}

// ── Logout ─────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('dw_admin_auth');
  localStorage.removeItem('dw_admin_user');
  window.location.href = 'login.html';
}

// ── Pending Badge ──────────────────────────────────────────
function updatePendingBadge() {
  const n     = allOrders.filter(o => o.status === 'Pending').length;
  const badge = document.getElementById('pending-badge');
  badge.textContent = n;
  badge.classList.toggle('hidden', n === 0);

  document.getElementById('stat-pending') &&
    (document.getElementById('stat-pending').textContent = n);
}

// ══════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════
function renderDashboard() {
  const revenue   = allOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const completed = allOrders.filter(o => o.status === 'Completed').length;
  const pending   = allOrders.filter(o => o.status === 'Pending').length;

  document.getElementById('stat-revenue').textContent  = revenue.toLocaleString() + ' EGP';
  document.getElementById('stat-orders').textContent   = allOrders.length;
  document.getElementById('stat-watches').textContent  = allWatches.length;
  document.getElementById('stat-pending').textContent  = pending;

  renderRecentOrders();
  renderTopProducts('top-products-list');
  renderSalesChart();
}

function renderRecentOrders() {
  const tbody  = document.getElementById('recent-orders-body');
  const recent = allOrders.slice(0, 5);

  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted)">لا توجد طلبات بعد</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(o => `
    <tr>
      <td><strong style="color:var(--gold);font-size:.82rem">#${fmtId(o.id)}</strong></td>
      <td>${o.customer_name || '—'}</td>
      <td><strong>${Number(o.total_price||0).toLocaleString()} EGP</strong></td>
      <td style="font-size:.82rem">${o.payment_method || '—'}</td>
      <td><span class="badge badge-${o.status==='Completed'?'completed':'pending'}">${o.status==='Completed'?'مكتمل':'انتظار'}</span></td>
      <td style="font-size:.75rem;color:var(--muted)">${fmtDate(o.created_at)}</td>
    </tr>`).join('');
}

function renderTopProducts(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const counts = {};
  allOrders.forEach(o => {
    try { JSON.parse(o.items||'[]').forEach(item => { counts[item.id] = (counts[item.id]||0) + (item.qty||1); }); } catch(_) {}
  });

  const sorted = allWatches
    .map(w => ({ ...w, sales: counts[w.id] || 0 }))
    .sort((a,b) => b.sales - a.sales)
    .slice(0, 5);

  if (!sorted.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:.85rem;text-align:center;padding:16px">لا توجد بيانات</p>';
    return;
  }

  container.innerHTML = sorted.map((w, i) => `
    <div class="top-product">
      <div class="top-rank">${i+1}</div>
      <img src="${w.image_url}" alt="${w.name}"
           onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=44&q=60'" />
      <div style="flex:1">
        <div class="top-product-name">${w.name}</div>
        <div class="top-product-cat">${w.category}</div>
      </div>
      <div class="top-product-sales">${w.sales} مبيعة</div>
    </div>`).join('');
}

function renderSalesChart() {
  const ctx = document.getElementById('sales-chart');
  if (!ctx) return;

  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const data   = new Array(12).fill(0);
  allOrders.forEach(o => { data[new Date(o.created_at).getMonth()] += Number(o.total_price||0); });

  const end    = new Date().getMonth();
  const labels = months.slice(0, end + 1);
  const values = data.slice(0, end + 1);

  if (salesChart) salesChart.destroy();
  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'الإيرادات',
        data: values,
        borderColor: '#D4AF37',
        backgroundColor: 'rgba(212,175,55,.08)',
        tension: .4, fill: true,
        pointBackgroundColor: '#D4AF37',
        pointBorderColor: '#0A0E27',
        pointRadius: 5, pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#A0A0A0', font: { size: 11 } } },
        x: { grid: { display: false }, ticks: { color: '#A0A0A0', font: { size: 11 } } }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════
//  WATCHES
// ══════════════════════════════════════════════════════════
function renderWatches() {
  const tbody = document.getElementById('watches-tbody');
  if (!allWatches.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--muted)">لا توجد ساعات. أضف أول ساعة! ⌚</td></tr>';
    return;
  }
  tbody.innerHTML = allWatches.map(w => `
    <tr>
      <td><img class="watch-thumb" src="${w.image_url}" alt="${w.name}"
               onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=48&q=60'" /></td>
      <td><strong style="color:var(--white)">${w.name}</strong></td>
      <td style="color:var(--muted)">${w.name_ar || '—'}</td>
      <td><span class="badge badge-${w.category.toLowerCase()}">${w.category}</span></td>
      <td><strong style="color:var(--gold)">${Number(w.price).toLocaleString()} EGP</strong></td>
      <td>
        <span style="color:${w.stock>5?'#27ae60':w.stock>0?'#f39c12':'#e74c3c'};font-weight:600">
          ${w.stock > 0 ? w.stock : 'نفد'}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" onclick="openWatchModal('${w.id}')" title="تعديل">✏️</button>
          <button class="btn-icon del"  onclick="confirmDelete(()=>deleteWatch('${w.id}'))" title="حذف">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

function openWatchModal(id = null) {
  const title = document.getElementById('watch-modal-title');

  if (id) {
    const w = allWatches.find(x => x.id === id);
    if (!w) return;
    title.textContent = 'تعديل الساعة';
    document.getElementById('watch-id').value    = w.id;
    document.getElementById('w-name').value      = w.name || '';
    document.getElementById('w-name-ar').value   = w.name_ar || '';
    document.getElementById('w-image').value     = w.image_url || '';
    document.getElementById('w-price').value     = w.price || '';
    document.getElementById('w-stock').value     = w.stock ?? '';
    document.getElementById('w-category').value  = w.category || 'Men';
    document.getElementById('w-desc').value      = w.description || '';
    document.getElementById('w-desc-ar').value   = w.description_ar || '';
    previewImage(w.image_url);
  } else {
    title.textContent = 'إضافة ساعة جديدة';
    ['watch-id','w-name','w-name-ar','w-image','w-price','w-stock','w-desc','w-desc-ar'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('w-category').value = 'Men';
    document.getElementById('img-preview').innerHTML = '<div class="img-preview-placeholder">🖼 معاينة الصورة</div>';
  }

  document.getElementById('watch-modal').classList.add('open');
}

function closeWatchModal() {
  document.getElementById('watch-modal').classList.remove('open');
}

function previewImage(url) {
  const p = document.getElementById('img-preview');
  if (!url) { p.innerHTML = '<div class="img-preview-placeholder">🖼 معاينة الصورة</div>'; return; }
  p.innerHTML = `<img src="${url}" alt="preview"
    onerror="this.parentElement.innerHTML='<div class=\\'img-preview-placeholder\\'>❌ رابط غير صالح</div>'" />`;
}

async function saveWatch() {
  const id       = document.getElementById('watch-id').value;
  const name     = document.getElementById('w-name').value.trim();
  const name_ar  = document.getElementById('w-name-ar').value.trim();
  const image    = document.getElementById('w-image').value.trim();
  const price    = parseFloat(document.getElementById('w-price').value);
  const stock    = parseInt(document.getElementById('w-stock').value);
  const category = document.getElementById('w-category').value;
  const desc     = document.getElementById('w-desc').value.trim();
  const desc_ar  = document.getElementById('w-desc-ar').value.trim();

  if (!name || isNaN(price) || isNaN(stock)) {
    showToast('يرجى ملء الحقول المطلوبة (الاسم، السعر، المخزون)', 'error'); return;
  }

  const btn = document.getElementById('save-watch-btn');
  btn.disabled = true; btn.textContent = '⏳ جارٍ الحفظ...';

  try {
    await DB.saveWatch({
      id: id || crypto.randomUUID(),
      name, name_ar, price, stock, category,
      image_url: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
      description: desc, description_ar: desc_ar
    });
    showToast(id ? '✅ تم التعديل بنجاح' : '✅ تمت الإضافة بنجاح', 'success');
    closeWatchModal();
    await loadAll();
    renderWatches();
  } catch (e) {
    showToast('❌ حدث خطأ أثناء الحفظ', 'error');
  } finally {
    btn.disabled = false; btn.textContent = '💾 حفظ';
  }
}

async function deleteWatch(id) {
  try {
    await DB.deleteWatch(id);
    showToast('🗑 تم الحذف بنجاح', 'success');
    await loadAll(); renderWatches();
  } catch { showToast('❌ خطأ في الحذف', 'error'); }
}

// ══════════════════════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════════════════════
function renderOrders(filter = 'all') {
  currentOrderFilter = filter;
  const tbody = document.getElementById('orders-tbody');
  const list  = filter === 'all' ? allOrders : allOrders.filter(o => o.status === filter);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:48px;color:var(--muted)">
      ${filter === 'Pending' ? 'لا توجد طلبات معلقة 🎉' : 'لا توجد طلبات بعد'}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(o => `
    <tr>
      <td><strong style="color:var(--gold);font-size:.82rem">#${fmtId(o.id)}</strong></td>
      <td>${o.customer_name || '—'}</td>
      <td dir="ltr" style="font-size:.82rem">${o.phone || '—'}</td>
      <td style="font-size:.82rem">${o.city || '—'}</td>
      <td style="font-size:.82rem">${o.payment_method || '—'}</td>
      <td><strong style="color:var(--gold)">${Number(o.total_price||0).toLocaleString()} EGP</strong></td>
      <td><span class="badge badge-${o.status==='Completed'?'completed':'pending'}">${o.status==='Completed'?'مكتمل':'انتظار'}</span></td>
      <td style="font-size:.75rem;color:var(--muted)">${fmtDate(o.created_at)}</td>
      <td>
        ${o.status !== 'Completed'
          ? `<button class="btn-icon done" onclick="markOrderDone('${o.id}')" title="تحديد كمكتمل">✅</button>`
          : `<span style="color:var(--muted);font-size:.75rem">—</span>`}
      </td>
    </tr>`).join('');
}

function filterOrders(status, btn) {
  document.querySelectorAll('#orders-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderOrders(status);
}

async function markOrderDone(id) {
  try {
    await DB.updateOrderStatus(id, 'Completed');
    showToast('✅ تم تحديث الطلب كمكتمل', 'success');
    await loadAll();
    renderOrders(currentOrderFilter);
    updatePendingBadge();
  } catch { showToast('❌ خطأ في التحديث', 'error'); }
}

// ══════════════════════════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════════════════════════
function renderAnalytics() {
  renderRevenueChart();
  renderProductsChart();
  renderPaymentChart();
  renderOrdersStatusStats();
}

function renderRevenueChart() {
  const ctx = document.getElementById('revenue-chart');
  if (!ctx) return;
  if (revenueChart) revenueChart.destroy();

  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const data   = new Array(12).fill(0);
  allOrders.forEach(o => { data[new Date(o.created_at).getMonth()] += Number(o.total_price||0); });

  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'الإيرادات (EGP)',
        data,
        backgroundColor: 'rgba(212,175,55,.25)',
        borderColor: '#D4AF37',
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#A0A0A0', font: {size:10} } },
        x: { grid: { display: false }, ticks: { color: '#A0A0A0', font: {size:10} } }
      }
    }
  });
}

function renderProductsChart() {
  const ctx = document.getElementById('products-chart');
  if (!ctx) return;
  if (productsChart) productsChart.destroy();

  const counts = {};
  allOrders.forEach(o => {
    try { JSON.parse(o.items||'[]').forEach(item => { counts[item.id] = (counts[item.id]||0) + (item.qty||1); }); } catch(_) {}
  });
  const top = allWatches.map(w => ({ name: w.name, sales: counts[w.id]||0 }))
    .sort((a,b) => b.sales - a.sales).slice(0, 5);

  const colors = ['rgba(212,175,55,.8)','rgba(52,152,219,.7)','rgba(39,174,96,.7)','rgba(231,76,60,.7)','rgba(155,89,182,.7)'];

  productsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top.map(p => p.name),
      datasets: [{
        label: 'المبيعات',
        data: top.map(p => p.sales),
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('.7','.9').replace('.8','1')),
        borderWidth: 1, borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#A0A0A0', font:{size:10} } },
        y: { grid: { display: false }, ticks: { color: '#A0A0A0', font:{size:11} } }
      }
    }
  });
}

function renderPaymentChart() {
  const ctx = document.getElementById('payment-chart');
  if (!ctx) return;
  if (paymentChart) paymentChart.destroy();

  const counts = {};
  allOrders.forEach(o => { const m = o.payment_method||'Other'; counts[m] = (counts[m]||0)+1; });

  paymentChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['rgba(212,175,55,.8)','rgba(52,152,219,.7)','rgba(39,174,96,.7)'],
        borderColor: '#1A1F3A', borderWidth: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#A0A0A0', font:{size:11}, padding:12 } } },
      cutout: '65%'
    }
  });
}

function renderOrdersStatusStats() {
  const container = document.getElementById('orders-status-stats');
  if (!container) return;

  const pending   = allOrders.filter(o => o.status === 'Pending').length;
  const completed = allOrders.filter(o => o.status === 'Completed').length;
  const total     = allOrders.length;

  const pendingPct   = total ? Math.round(pending / total * 100) : 0;
  const completedPct = total ? Math.round(completed / total * 100) : 0;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:20px">
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:.88rem">قيد الانتظار</span>
          <strong style="color:#f39c12">${pending} (${pendingPct}%)</strong>
        </div>
        <div style="height:8px;background:rgba(255,255,255,.06);border-radius:4px">
          <div style="height:100%;width:${pendingPct}%;background:#f39c12;border-radius:4px;transition:width .6s ease"></div>
        </div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:.88rem">مكتملة</span>
          <strong style="color:#27ae60">${completed} (${completedPct}%)</strong>
        </div>
        <div style="height:8px;background:rgba(255,255,255,.06);border-radius:4px">
          <div style="height:100%;width:${completedPct}%;background:#27ae60;border-radius:4px;transition:width .6s ease"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:8px">
        <div style="background:rgba(255,255,255,.04);border-radius:8px;padding:14px;text-align:center">
          <div style="font-size:1.4rem;font-weight:700;color:var(--gold)">${total}</div>
          <div style="font-size:.72rem;color:var(--muted)">إجمالي الطلبات</div>
        </div>
        <div style="background:rgba(255,255,255,.04);border-radius:8px;padding:14px;text-align:center">
          <div style="font-size:1.4rem;font-weight:700;color:#27ae60">${completed}</div>
          <div style="font-size:.72rem;color:var(--muted)">مكتملة</div>
        </div>
        <div style="background:rgba(255,255,255,.04);border-radius:8px;padding:14px;text-align:center">
          <div style="font-size:1.4rem;font-weight:700;color:#f39c12">${pending}</div>
          <div style="font-size:.72rem;color:var(--muted)">انتظار</div>
        </div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
//  COUPONS
// ══════════════════════════════════════════════════════════
function renderCoupons() {
  const grid = document.getElementById('coupons-grid');
  if (!allCoupons.length) {
    grid.innerHTML = '<p style="color:var(--muted)">لا توجد كوبونات. أضف أول كوبون! 🎁</p>';
    return;
  }
  grid.innerHTML = allCoupons.map(c => `
    <div class="coupon-card">
      <div class="coupon-code">🎁 ${c.code}</div>
      <div class="coupon-discount">خصم: <strong style="color:var(--gold)">${c.discount_amount} EGP</strong></div>
      <div class="coupon-uses">استُخدم: ${c.uses_count || 0} مرة</div>
      <div class="coupon-actions">
        <button class="btn btn-danger" style="font-size:.76rem;padding:6px 14px"
                onclick="confirmDelete(()=>deleteCoupon('${c.id}'))">حذف</button>
      </div>
    </div>`).join('');
}

function openCouponModal() {
  document.getElementById('c-code').value     = '';
  document.getElementById('c-discount').value = '';
  document.getElementById('coupon-modal').classList.add('open');
}
function closeCouponModal() {
  document.getElementById('coupon-modal').classList.remove('open');
}

async function saveCoupon() {
  const code     = document.getElementById('c-code').value.trim().toUpperCase();
  const discount = parseFloat(document.getElementById('c-discount').value);
  if (!code || isNaN(discount) || discount <= 0) {
    showToast('يرجى إدخال الكود والخصم', 'error'); return;
  }
  try {
    await DB.saveCoupon({ code, discount_amount: discount });
    showToast('✅ تمت إضافة الكوبون', 'success');
    closeCouponModal(); await loadAll(); renderCoupons();
  } catch { showToast('❌ خطأ — ربما الكود موجود مسبقاً', 'error'); }
}

async function deleteCoupon(id) {
  try {
    await DB.deleteCoupon(id);
    showToast('🗑 تم حذف الكوبون', 'success');
    await loadAll(); renderCoupons();
  } catch { showToast('❌ خطأ في الحذف', 'error'); }
}

// ══════════════════════════════════════════════════════════
//  DELETE CONFIRM
// ══════════════════════════════════════════════════════════
function confirmDelete(cb) {
  deleteCallback = cb;
  document.getElementById('delete-modal').classList.add('open');
  document.getElementById('confirm-delete-btn').onclick = async () => {
    closeDeleteModal();
    if (deleteCallback) { await deleteCallback(); deleteCallback = null; }
  };
}
function closeDeleteModal() {
  document.getElementById('delete-modal').classList.remove('open');
}

// ── Helpers ────────────────────────────────────────────────
function fmtId(id)   { return String(id||'').slice(-6).toUpperCase(); }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-EG', { day:'2-digit', month:'short', year:'numeric' });
}

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 350); }, 3200);
}
