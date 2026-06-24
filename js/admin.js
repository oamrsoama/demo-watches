/* ============================================================
   DEMO WATCHES — Admin Dashboard Logic
   ============================================================ */

// ── Auth Guard ─────────────────────────────────────────────
if (localStorage.getItem('dw_admin_auth') !== 'true') {
  window.location.href = 'login.html';
}

// ── Init ───────────────────────────────────────────────────
let allWatches = [];
let allOrders  = [];
let allCoupons = [];
let salesChart = null;
let currentOrderFilter = 'all';
let deleteCallback = null;

document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();

  const user = localStorage.getItem('dw_admin_user') || 'Admin';
  document.getElementById('admin-user-tag').textContent = user;

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
  } catch (e) {
    showToast('خطأ في تحميل البيانات', 'error');
  }
}

// ── Navigation ─────────────────────────────────────────────
const pageTitles = {
  dashboard: 'لوحة التحكم',
  watches:   'إدارة الساعات',
  orders:    'الطلبات',
  coupons:   'كوبونات الخصم'
};

async function showPage(page) {
  // Hide all pages
  document.querySelectorAll('[id^="page-"]').forEach(el => el.classList.add('hidden'));
  document.getElementById(`page-${page}`).classList.remove('hidden');

  // Update nav active
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  document.getElementById('page-title').textContent = pageTitles[page] || page;
  closeSidebar();

  await loadAll();

  if (page === 'dashboard') renderDashboard();
  if (page === 'watches')   renderWatches();
  if (page === 'orders')    renderOrders();
  if (page === 'coupons')   renderCoupons();

  // Update pending badge
  const pending = allOrders.filter(o => o.status === 'Pending').length;
  const badge = document.getElementById('pending-badge');
  badge.textContent = pending;
  badge.style.display = pending > 0 ? 'inline-block' : 'none';
}

// ── Sidebar ────────────────────────────────────────────────
function toggleSidebar() {
  const s = document.getElementById('sidebar');
  const o = document.getElementById('sidebar-overlay');
  s.classList.toggle('open');
  o.style.display = s.classList.contains('open') ? 'block' : 'none';
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

// ── Dashboard ──────────────────────────────────────────────
function renderDashboard() {
  const completed = allOrders.filter(o => o.status === 'Completed');
  const revenue   = allOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);

  document.getElementById('stat-watches').textContent   = allWatches.length;
  document.getElementById('stat-orders').textContent    = allOrders.length;
  document.getElementById('stat-completed').textContent = completed.length;
  document.getElementById('stat-revenue').textContent   = revenue.toLocaleString() + ' EGP';

  renderRecentOrders();
  renderTopProducts();
  renderSalesChart();
}

function renderRecentOrders() {
  const tbody = document.getElementById('recent-orders-body');
  const recent = allOrders.slice(0, 5);

  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--gray)">لا توجد طلبات حتى الآن</td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(o => `
    <tr>
      <td><strong style="color:var(--green)">#${String(o.id).slice(-6).toUpperCase()}</strong></td>
      <td>${o.customer_name || '—'}</td>
      <td>${Number(o.total_price || 0).toLocaleString()} EGP</td>
      <td>${o.payment_method || '—'}</td>
      <td><span class="badge badge-${o.status === 'Completed' ? 'completed' : 'pending'}">${o.status === 'Completed' ? 'مكتمل' : 'قيد الانتظار'}</span></td>
      <td style="font-size:.8rem;color:var(--gray)">${formatDate(o.created_at)}</td>
    </tr>
  `).join('');
}

function renderTopProducts() {
  const container = document.getElementById('top-products-list');

  // Count order items
  const counts = {};
  allOrders.forEach(o => {
    try {
      const items = JSON.parse(o.items || '[]');
      items.forEach(item => {
        counts[item.id] = (counts[item.id] || 0) + (item.qty || 1);
      });
    } catch (_) {}
  });

  const sorted = allWatches
    .map(w => ({ ...w, sales: counts[w.id] || 0 }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  if (!sorted.length) {
    container.innerHTML = '<p style="color:var(--gray);font-size:.85rem">لا توجد بيانات</p>';
    return;
  }

  container.innerHTML = sorted.map((w, i) => `
    <div class="top-product">
      <div class="top-rank">${i + 1}</div>
      <img src="${w.image_url}" alt="${w.name}"
           onerror="this.src='https://via.placeholder.com/44/1B5E3F/D4AF37?text=W'" />
      <div class="top-product-info">
        <div class="top-product-name">${w.name}</div>
        <div class="top-product-cat">${w.category}</div>
      </div>
      <div class="top-product-sales">${w.sales} مبيعة</div>
    </div>
  `).join('');
}

function renderSalesChart() {
  const ctx = document.getElementById('sales-chart');
  if (!ctx) return;

  // Build monthly sales from orders
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const data = new Array(12).fill(0);

  allOrders.forEach(o => {
    const month = new Date(o.created_at).getMonth();
    data[month] += Number(o.total_price || 0);
  });

  const currentMonth = new Date().getMonth();
  const labels = months.slice(0, currentMonth + 1);
  const values = data.slice(0, currentMonth + 1);

  if (salesChart) salesChart.destroy();

  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'الإيرادات (EGP)',
        data: values,
        borderColor: '#1B5E3F',
        backgroundColor: 'rgba(27,94,63,.08)',
        tension: .4,
        fill: true,
        pointBackgroundColor: '#D4AF37',
        pointBorderColor: '#D4AF37',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ── Watches ────────────────────────────────────────────────
function renderWatches() {
  const tbody = document.getElementById('watches-tbody');
  if (!allWatches.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--gray)">لا توجد ساعات. أضف أولى!</td></tr>';
    return;
  }

  tbody.innerHTML = allWatches.map(w => `
    <tr>
      <td>
        <img class="watch-thumb" src="${w.image_url}" alt="${w.name}"
             onerror="this.src='https://via.placeholder.com/48/1B5E3F/D4AF37?text=W'" />
      </td>
      <td><strong>${w.name}</strong></td>
      <td>${w.name_ar || '—'}</td>
      <td><span class="badge badge-${w.category.toLowerCase()}">${w.category}</span></td>
      <td><strong style="color:var(--green)">${Number(w.price).toLocaleString()} EGP</strong></td>
      <td>
        <span style="color:${w.stock > 5 ? 'var(--green2)' : w.stock > 0 ? '#f39c12' : 'var(--red)'}">
          ${w.stock > 0 ? w.stock : 'نفد'}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" onclick="openWatchModal('${w.id}')" title="تعديل">✏️</button>
          <button class="btn-icon del"  onclick="confirmDelete(() => deleteWatch('${w.id}'))" title="حذف">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openWatchModal(id = null) {
  const modal = document.getElementById('watch-modal');
  const title = document.getElementById('watch-modal-title');

  if (id) {
    const w = allWatches.find(x => x.id === id);
    if (!w) return;
    title.textContent = 'تعديل الساعة';
    document.getElementById('watch-id').value    = w.id;
    document.getElementById('w-name').value      = w.name;
    document.getElementById('w-name-ar').value   = w.name_ar || '';
    document.getElementById('w-image').value     = w.image_url || '';
    document.getElementById('w-price').value     = w.price;
    document.getElementById('w-stock').value     = w.stock;
    document.getElementById('w-category').value  = w.category;
    document.getElementById('w-desc').value      = w.description || '';
    document.getElementById('w-desc-ar').value   = w.description_ar || '';
    previewImage(w.image_url);
  } else {
    title.textContent = 'إضافة ساعة جديدة';
    document.getElementById('watch-id').value   = '';
    document.getElementById('w-name').value     = '';
    document.getElementById('w-name-ar').value  = '';
    document.getElementById('w-image').value    = '';
    document.getElementById('w-price').value    = '';
    document.getElementById('w-stock').value    = '';
    document.getElementById('w-category').value = 'Men';
    document.getElementById('w-desc').value     = '';
    document.getElementById('w-desc-ar').value  = '';
    document.getElementById('img-preview').innerHTML = '<div class="img-preview-placeholder">🖼 معاينة الصورة</div>';
  }

  modal.classList.add('open');
}

function closeWatchModal() {
  document.getElementById('watch-modal').classList.remove('open');
}

function previewImage(url) {
  const preview = document.getElementById('img-preview');
  if (!url) {
    preview.innerHTML = '<div class="img-preview-placeholder">🖼 معاينة الصورة</div>';
    return;
  }
  preview.innerHTML = `<img src="${url}" alt="preview" onerror="this.parentElement.innerHTML='<div class=\\'img-preview-placeholder\\'>❌ رابط غير صالح</div>'" />`;
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

  if (!name || !price || isNaN(stock)) {
    showToast('يرجى ملء الحقول المطلوبة', 'error'); return;
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
    await loadAll();
    renderWatches();
  } catch (e) {
    showToast('❌ خطأ في الحذف', 'error');
  }
}

// ── Orders ─────────────────────────────────────────────────
function renderOrders(filter = currentOrderFilter) {
  currentOrderFilter = filter;
  const tbody = document.getElementById('orders-tbody');
  const list  = filter === 'all' ? allOrders : allOrders.filter(o => o.status === filter);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--gray)">
      ${filter === 'Pending' ? 'لا توجد طلبات معلقة' : 'لا توجد طلبات'}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(o => `
    <tr>
      <td><strong style="color:var(--green)">#${String(o.id).slice(-6).toUpperCase()}</strong></td>
      <td>${o.customer_name || '—'}</td>
      <td dir="ltr">${o.phone || '—'}</td>
      <td>${o.city || '—'}</td>
      <td>${o.payment_method || '—'}</td>
      <td><strong>${Number(o.total_price || 0).toLocaleString()} EGP</strong></td>
      <td><span class="badge badge-${o.status === 'Completed' ? 'completed' : 'pending'}">${o.status === 'Completed' ? 'مكتمل' : 'قيد الانتظار'}</span></td>
      <td style="font-size:.78rem;color:var(--gray)">${formatDate(o.created_at)}</td>
      <td>
        ${o.status !== 'Completed'
          ? `<button class="btn-icon done" onclick="markOrderDone('${o.id}')" title="تحديد كمكتمل">✅</button>`
          : `<span style="color:var(--gray);font-size:.78rem">—</span>`
        }
      </td>
    </tr>
  `).join('');
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
    renderOrders();
    // Update pending badge
    const pending = allOrders.filter(o => o.status === 'Pending').length;
    const badge = document.getElementById('pending-badge');
    badge.textContent = pending;
    badge.style.display = pending > 0 ? 'inline-block' : 'none';
  } catch (e) {
    showToast('❌ خطأ في التحديث', 'error');
  }
}

// ── Coupons ────────────────────────────────────────────────
function renderCoupons() {
  const grid = document.getElementById('coupons-grid');
  if (!allCoupons.length) {
    grid.innerHTML = '<p style="color:var(--gray)">لا توجد كوبونات. أضف أول كوبون!</p>';
    return;
  }

  grid.innerHTML = allCoupons.map(c => `
    <div class="coupon-card">
      <div class="coupon-code">🎁 ${c.code}</div>
      <div class="coupon-discount">خصم: <strong style="color:var(--green)">${c.discount_amount} EGP</strong></div>
      <div class="coupon-uses">استُخدم: ${c.uses_count || 0} مرة</div>
      <div class="coupon-actions">
        <button class="btn btn-danger" style="font-size:.78rem;padding:6px 14px"
                onclick="confirmDelete(() => deleteCoupon('${c.id}'))">حذف</button>
      </div>
    </div>
  `).join('');
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
    closeCouponModal();
    await loadAll();
    renderCoupons();
  } catch (e) {
    showToast('❌ خطأ — ربما الكود موجود بالفعل', 'error');
  }
}

async function deleteCoupon(id) {
  try {
    await DB.deleteCoupon(id);
    showToast('🗑 تم حذف الكوبون', 'success');
    await loadAll();
    renderCoupons();
  } catch (e) {
    showToast('❌ خطأ في الحذف', 'error');
  }
}

// ── Delete Confirm ─────────────────────────────────────────
function confirmDelete(cb) {
  deleteCallback = cb;
  document.getElementById('delete-modal').classList.add('open');
  document.getElementById('confirm-delete-btn').onclick = async () => {
    closeDeleteModal();
    if (deleteCallback) await deleteCallback();
    deleteCallback = null;
  };
}
function closeDeleteModal() {
  document.getElementById('delete-modal').classList.remove('open');
}

// ── Helpers ────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' });
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}
