/* ============================================================
   DEMO WATCHES — Public Store Logic
   ============================================================ */

// ── State ──────────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('dw_cart') || '[]');
let watches = [];
let currentFilter = 'all';
let currentLang = localStorage.getItem('dw_lang') || 'ar';
let appliedCoupon = null;
let currentOrderNum = null;

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  applyLang(currentLang);
  setupFilterBtns();
  setupPaymentOpts();
  updateCartUI();

  try {
    watches = await DB.getWatches();
  } catch (e) {
    watches = JSON.parse(JSON.stringify(DEMO_WATCHES));
  }

  renderProducts(watches);
  updateCategoryCounts();

  // Hide loading overlay
  setTimeout(() => {
    document.getElementById('loading-overlay').classList.add('fade-out');
  }, 800);

  // Update newsletter placeholder
  updateNewsletterPlaceholder();
});

// ── Language ───────────────────────────────────────────────
function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('dw_lang', lang);
  const isAr = lang === 'ar';
  document.documentElement.lang = lang;
  document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  document.getElementById('lang-toggle').textContent = isAr ? 'EN' : 'ع';

  document.querySelectorAll('[data-ar]').forEach(el => {
    const text = el.getAttribute(`data-${lang}`);
    if (text) {
      // Check if content has HTML tags
      if (text.includes('<')) el.innerHTML = text;
      else el.textContent = text;
    }
  });

  updateNewsletterPlaceholder();
  renderProducts(watches);
  renderCartItems();
}

function updateNewsletterPlaceholder() {
  const input = document.getElementById('newsletter-email');
  if (input) input.placeholder = currentLang === 'ar' ? 'بريدك الإلكتروني' : 'Your email address';
}

document.getElementById('lang-toggle').addEventListener('click', () => {
  applyLang(currentLang === 'ar' ? 'en' : 'ar');
});

// ── Mobile Nav ─────────────────────────────────────────────
document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('mobile-nav').classList.add('open');
});
document.getElementById('mobile-nav-close').addEventListener('click', closeMobileNav);
function closeMobileNav() {
  document.getElementById('mobile-nav').classList.remove('open');
}

// ── Filter ─────────────────────────────────────────────────
function setupFilterBtns() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      const filtered = currentFilter === 'all' ? watches : watches.filter(w => w.category === currentFilter);
      renderProducts(filtered);
    });
  });
}

function filterByCategory(cat) {
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === cat);
  });
  const filtered = watches.filter(w => w.category === cat);
  renderProducts(filtered);
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// ── Render Products ────────────────────────────────────────
function renderProducts(list) {
  const grid = document.getElementById('products-grid');
  if (!list || list.length === 0) {
    grid.innerHTML = `<div style="text-align:center;padding:60px;color:var(--gray);grid-column:1/-1">
      <div style="font-size:3rem;margin-bottom:12px">⌚</div>
      <p>${currentLang === 'ar' ? 'لا توجد منتجات في هذا التصنيف' : 'No products in this category'}</p>
    </div>`;
    return;
  }

  grid.innerHTML = list.map((w, i) => {
    const name = currentLang === 'ar' ? (w.name_ar || w.name) : w.name;
    const desc = currentLang === 'ar' ? (w.description_ar || w.description) : w.description;
    const catLabel = getCatLabel(w.category);
    const inCart = cart.some(c => c.id === w.id);
    const outOfStock = w.stock <= 0;

    return `
    <div class="product-card" style="animation-delay:${i * .05}s">
      ${i < 3 ? `<div class="product-badge">${currentLang === 'ar' ? '⭐ الأكثر مبيعاً' : '⭐ Best Seller'}</div>` : ''}
      <div class="product-img-wrap">
        <img src="${w.image_url}" alt="${name}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/400x300/1B5E3F/D4AF37?text=Watch'" />
      </div>
      <div class="product-info">
        <div class="product-category">${catLabel}</div>
        <div class="product-name">${name}</div>
        <div class="product-desc">${desc}</div>
        <div class="product-footer">
          <div class="product-price">${Number(w.price).toLocaleString()} <span>EGP</span></div>
          ${outOfStock
            ? `<button class="add-cart-btn" disabled style="background:#ccc;cursor:not-allowed" title="${currentLang === 'ar' ? 'نفدت الكمية' : 'Out of Stock'}">✕</button>`
            : `<button class="add-cart-btn" onclick="addToCart('${w.id}')" title="${currentLang === 'ar' ? 'أضف للسلة' : 'Add to Cart'}">
                 ${inCart ? '✓' : '+'}
               </button>`
          }
        </div>
      </div>
    </div>`;
  }).join('');
}

function getCatLabel(cat) {
  const labels = {
    Men:    { ar: 'رجالي',   en: 'Men' },
    Women:  { ar: 'نسائي',   en: 'Women' },
    Unisex: { ar: 'للجنسين', en: 'Unisex' }
  };
  return labels[cat]?.[currentLang] || cat;
}

function updateCategoryCounts() {
  const counts = { Men: 0, Women: 0, Unisex: 0 };
  watches.forEach(w => { if (counts[w.category] !== undefined) counts[w.category]++; });

  const catItems = document.querySelectorAll('.cat-overlay');
  const cats = ['Men', 'Women', 'Unisex'];
  catItems.forEach((el, i) => {
    const countEl = el.querySelector('.cat-count');
    if (countEl) {
      const n = counts[cats[i]];
      countEl.setAttribute('data-ar', `${n} ${n === 1 ? 'ساعة' : 'ساعات'}`);
      countEl.setAttribute('data-en', `${n} Watch${n !== 1 ? 'es' : ''}`);
      countEl.textContent = currentLang === 'ar' ? `${n} ${n === 1 ? 'ساعة' : 'ساعات'}` : `${n} Watch${n !== 1 ? 'es' : ''}`;
    }
  });
}

// ── Cart ───────────────────────────────────────────────────
function addToCart(watchId) {
  const watch = watches.find(w => w.id === watchId);
  if (!watch) return;

  const existing = cart.find(c => c.id === watchId);
  if (existing) {
    existing.qty = Math.min(existing.qty + 1, watch.stock);
  } else {
    cart.push({ id: watchId, qty: 1, name: watch.name, name_ar: watch.name_ar, price: watch.price, image_url: watch.image_url });
  }

  saveCart();
  updateCartUI();
  renderProducts(currentFilter === 'all' ? watches : watches.filter(w => w.category === currentFilter));

  showToast(currentLang === 'ar' ? '✅ تمت الإضافة للسلة' : '✅ Added to cart', 'success');

  // Bounce badge
  const badge = document.getElementById('cart-badge');
  badge.style.animation = 'none';
  badge.offsetWidth; // reflow
  badge.style.animation = 'popIn .3s cubic-bezier(.175,.885,.32,1.275)';
}

function removeFromCart(watchId) {
  cart = cart.filter(c => c.id !== watchId);
  saveCart();
  updateCartUI();
  renderCartItems();
  renderProducts(currentFilter === 'all' ? watches : watches.filter(w => w.category === currentFilter));
}

function changeQty(watchId, delta) {
  const item = cart.find(c => c.id === watchId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  const watch = watches.find(w => w.id === watchId);
  if (watch) item.qty = Math.min(item.qty, watch.stock);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function saveCart() {
  localStorage.setItem('dw_cart', JSON.stringify(cart));
}

function getCartTotal() {
  return cart.reduce((sum, c) => sum + (c.price * c.qty), 0);
}

function updateCartUI() {
  const total = cart.reduce((sum, c) => sum + c.qty, 0);
  const badge = document.getElementById('cart-badge');
  if (total > 0) {
    badge.textContent = total;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
  document.getElementById('cart-total-price').textContent = `${getCartTotal().toLocaleString()} EGP`;
}

function renderCartItems() {
  const container = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');

  if (cart.length === 0) {
    container.innerHTML = `<div class="cart-empty">
      <div class="cart-empty-icon">🛒</div>
      <p>${currentLang === 'ar' ? 'سلتك فارغة' : 'Your cart is empty'}</p>
    </div>`;
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'block';
  container.innerHTML = cart.map(item => {
    const name = currentLang === 'ar' ? (item.name_ar || item.name) : item.name;
    return `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image_url}" alt="${name}"
           onerror="this.src='https://via.placeholder.com/72/1B5E3F/D4AF37?text=W'" />
      <div class="cart-item-info">
        <div class="cart-item-name">${name}</div>
        <div class="cart-item-price">${(item.price * item.qty).toLocaleString()} EGP</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
          <button class="remove-item" onclick="removeFromCart('${item.id}')">
            ${currentLang === 'ar' ? 'إزالة' : 'Remove'}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('cart-total-price').textContent = `${getCartTotal().toLocaleString()} EGP`;
}

// Cart open/close
document.getElementById('cart-toggle-btn').addEventListener('click', openCart);
function openCart() {
  renderCartItems();
  document.getElementById('cart-sidebar').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cart-sidebar').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Checkout ───────────────────────────────────────────────
function openCheckout() {
  if (cart.length === 0) {
    showToast(currentLang === 'ar' ? 'السلة فارغة!' : 'Cart is empty!', 'error');
    return;
  }
  closeCart();
  updateOrderSummary();
  document.getElementById('checkout-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCheckout() {
  document.getElementById('checkout-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function updateOrderSummary() {
  const sub = getCartTotal();
  const discount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const total = Math.max(0, sub - discount) + SHIPPING_FEE;

  document.getElementById('summary-sub').textContent = `${sub.toLocaleString()} EGP`;
  document.getElementById('summary-total').textContent = `${total.toLocaleString()} EGP`;

  const discountRow = document.getElementById('summary-discount-row');
  if (discount > 0) {
    discountRow.classList.remove('hidden');
    document.getElementById('summary-discount').textContent = `-${discount} EGP`;
  } else {
    discountRow.classList.add('hidden');
  }
}

// Payment options
function setupPaymentOpts() {
  document.querySelectorAll('.payment-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.payment-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      opt.querySelector('input').checked = true;
    });
  });
}

// Coupon
async function applyCoupon() {
  const code = document.getElementById('coupon-input').value.trim();
  const resultEl = document.getElementById('coupon-result');
  if (!code) return;

  try {
    const coupon = await DB.validateCoupon(code);
    if (coupon) {
      appliedCoupon = coupon;
      resultEl.className = 'coupon-result coupon-ok';
      resultEl.textContent = currentLang === 'ar'
        ? `✅ تم تطبيق خصم ${coupon.discount_amount} جنيه!`
        : `✅ Discount of ${coupon.discount_amount} EGP applied!`;
      updateOrderSummary();
    } else {
      resultEl.className = 'coupon-result coupon-err';
      resultEl.textContent = currentLang === 'ar' ? '❌ كود غير صحيح' : '❌ Invalid coupon code';
      appliedCoupon = null;
      updateOrderSummary();
    }
  } catch (e) {
    resultEl.className = 'coupon-result coupon-err';
    resultEl.textContent = currentLang === 'ar' ? '❌ حدث خطأ' : '❌ Error occurred';
  }
}

// Place Order
async function placeOrder() {
  const name    = document.getElementById('ship-name').value.trim();
  const phone   = document.getElementById('ship-phone').value.trim();
  const country = document.getElementById('ship-country').value;
  const city    = document.getElementById('ship-city').value.trim();
  const address = document.getElementById('ship-address').value.trim();
  const payment = document.querySelector('input[name="payment"]:checked')?.value || 'COD';

  if (!name || !phone || !city || !address) {
    showToast(currentLang === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', 'error');
    return;
  }

  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.textContent = currentLang === 'ar' ? '⏳ جارٍ الحفظ...' : '⏳ Saving...';

  const sub      = getCartTotal();
  const discount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const total    = Math.max(0, sub - discount) + SHIPPING_FEE;

  const orderData = {
    customer_name: name,
    phone, country, city,
    address,
    payment_method: payment,
    items: JSON.stringify(cart),
    subtotal: sub,
    discount,
    shipping: SHIPPING_FEE,
    total_price: total,
    coupon_used: appliedCoupon?.code || null,
    status: 'Pending'
  };

  try {
    const order = await DB.saveOrder(orderData);
    currentOrderNum = `#DW-${String(order.id || Date.now()).slice(-6).toUpperCase()}`;

    // WhatsApp message
    const items = cart.map(c => `• ${c.name} × ${c.qty}`).join('\n');
    const waMsg = encodeURIComponent(
      `🛍 طلب جديد من Demo Watches\n` +
      `━━━━━━━━━━\n${items}\n━━━━━━━━━━\n` +
      `💰 الإجمالي: ${total} EGP\n` +
      `💳 الدفع: ${payment}\n` +
      `📦 العنوان: ${city}, ${country}\n` +
      `📱 ${phone}\n` +
      `رقم الطلب: ${currentOrderNum}`
    );
    document.getElementById('whatsapp-link').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`;
    document.getElementById('confirm-order-num').textContent = currentOrderNum;

    // Clear cart
    cart = [];
    saveCart();
    updateCartUI();
    appliedCoupon = null;

    closeCheckout();
    document.getElementById('confirm-modal').classList.add('open');

  } catch (e) {
    showToast(currentLang === 'ar' ? '❌ حدث خطأ، حاول مجدداً' : '❌ Error occurred, please retry', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = currentLang === 'ar' ? '✅ تأكيد الطلب' : '✅ Confirm Order';
  }
}

function closeConfirm() {
  document.getElementById('confirm-modal').classList.remove('open');
  document.body.style.overflow = '';
  renderProducts(watches);
}

// ── Newsletter ─────────────────────────────────────────────
function handleNewsletter(e) {
  e.preventDefault();
  const email = document.getElementById('newsletter-email').value;
  if (email) {
    showToast(currentLang === 'ar' ? '🎉 شكراً للاشتراك!' : '🎉 Thanks for subscribing!', 'success');
    document.getElementById('newsletter-email').value = '';
  }
}

// ── Toast ──────────────────────────────────────────────────
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
