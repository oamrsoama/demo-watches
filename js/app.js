/* ============================================================
   DEMO WATCHES — Public Store Logic (Galaxy Theme)
   ============================================================ */

// ── State ──────────────────────────────────────────────────
let cart        = JSON.parse(localStorage.getItem('dw_cart') || '[]');
let watches     = [];
let currentFilter = 'all';
let currentLang   = localStorage.getItem('dw_lang') || 'ar';
let appliedCoupon = null;

// ── Carousel ───────────────────────────────────────────────
let carouselIndex   = 0;
let carouselTotal   = 0;
let carouselTimer   = null;
const CAROUSEL_DELAY = 5000;

function initCarousel() {
  const slides = document.querySelectorAll('.carousel-slide');
  carouselTotal = slides.length;
  if (carouselTotal < 2) return;
  startCarouselTimer();
}

function goToSlide(idx) {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots   = document.querySelectorAll('.dot');
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  carouselIndex = (idx + carouselTotal) % carouselTotal;
  slides[carouselIndex].classList.add('active');
  if (dots[carouselIndex]) dots[carouselIndex].classList.add('active');
}

function nextSlide() { goToSlide(carouselIndex + 1); resetCarouselTimer(); }
function prevSlide() { goToSlide(carouselIndex - 1); resetCarouselTimer(); }

function startCarouselTimer() {
  carouselTimer = setInterval(() => goToSlide(carouselIndex + 1), CAROUSEL_DELAY);
}
function resetCarouselTimer() {
  clearInterval(carouselTimer);
  startCarouselTimer();
}

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  nextSlide();
  if (e.key === 'ArrowRight') prevSlide();
});

// Touch swipe
(function() {
  let tx = 0;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  hero.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) { dx < 0 ? nextSlide() : prevSlide(); resetCarouselTimer(); }
  }, { passive: true });
})();

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  applyLang(currentLang);
  setupFilterBtns();
  setupPaymentOpts();
  updateCartUI();
  initCarousel();

  try {
    watches = await DB.getWatches();
  } catch (e) {
    watches = JSON.parse(JSON.stringify(DEMO_WATCHES));
  }

  renderProducts(watches);

  setTimeout(() => {
    document.getElementById('loading-overlay').classList.add('fade-out');
  }, 700);
});

// ── Language ───────────────────────────────────────────────
function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('dw_lang', lang);
  const isAr = lang === 'ar';
  document.documentElement.lang = lang;
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr';
  document.getElementById('lang-toggle').textContent = isAr ? 'EN' : 'ع';

  document.querySelectorAll('[data-ar]').forEach(el => {
    const txt = el.getAttribute(`data-${lang}`);
    if (!txt) return;
    if (txt.includes('<')) el.innerHTML = txt;
    else el.textContent = txt;
  });

  const emailInput = document.getElementById('newsletter-email');
  if (emailInput) emailInput.placeholder = isAr ? 'بريدك الإلكتروني' : 'Your email address';

  renderProducts(currentFilter === 'all' ? watches : watches.filter(w => w.category === currentFilter));
  renderCartItems();
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

// ── Filters ────────────────────────────────────────────────
function setupFilterBtns() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      const list = currentFilter === 'all' ? watches : watches.filter(w => w.category === currentFilter);
      renderProducts(list);
    });
  });
}

// ── Render Products ────────────────────────────────────────
function renderProducts(list) {
  const grid = document.getElementById('products-grid');
  if (!list || list.length === 0) {
    grid.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--muted);grid-column:1/-1">
      <div style="font-size:2.5rem;margin-bottom:12px;opacity:.3">⌚</div>
      <p>${currentLang === 'ar' ? 'لا توجد منتجات في هذا التصنيف' : 'No products in this category'}</p>
    </div>`;
    return;
  }

  grid.innerHTML = list.map((w, i) => {
    const name    = currentLang === 'ar' ? (w.name_ar || w.name) : w.name;
    const desc    = currentLang === 'ar' ? (w.description_ar || w.description) : w.description;
    const catLbl  = getCatLabel(w.category);
    const inCart  = cart.some(c => c.id === w.id);
    const noStock = w.stock <= 0;

    return `
    <div class="product-card fade-in" style="animation-delay:${i * .04}s">
      ${i < 3 ? `<div class="product-badge">${currentLang === 'ar' ? '⭐ الأكثر مبيعاً' : '⭐ Best Seller'}</div>` : ''}
      <div class="product-img-wrap">
        <img src="${w.image_url}" alt="${name}" loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'" />
      </div>
      <div class="product-info">
        <div class="product-category">${catLbl}</div>
        <div class="product-name">${name}</div>
        <div class="product-desc">${desc || ''}</div>
        <div class="product-footer">
          <div class="product-price">${Number(w.price).toLocaleString()} <span>EGP</span></div>
          ${noStock
            ? `<button class="add-cart-btn" disabled title="${currentLang === 'ar' ? 'نفدت الكمية' : 'Out of Stock'}">✕</button>`
            : `<button class="add-cart-btn" onclick="addToCart('${w.id}')" title="${currentLang === 'ar' ? 'أضف للسلة' : 'Add to cart'}">
                 ${inCart ? '✓' : '+'}
               </button>`
          }
        </div>
      </div>
    </div>`;
  }).join('');
}

function getCatLabel(cat) {
  const map = { Men: { ar:'رجالي', en:'Men' }, Women: { ar:'نسائي', en:'Women' }, Unisex: { ar:'للجنسين', en:'Unisex' } };
  return map[cat]?.[currentLang] || cat;
}

// ── Cart ───────────────────────────────────────────────────
function addToCart(id) {
  const watch = watches.find(w => w.id === id);
  if (!watch) return;
  const ex = cart.find(c => c.id === id);
  if (ex) ex.qty = Math.min(ex.qty + 1, watch.stock);
  else cart.push({ id, qty: 1, name: watch.name, name_ar: watch.name_ar, price: watch.price, image_url: watch.image_url });

  saveCart();
  updateCartUI();
  renderProducts(currentFilter === 'all' ? watches : watches.filter(w => w.category === currentFilter));
  showToast(currentLang === 'ar' ? '✅ تمت الإضافة للسلة' : '✅ Added to cart', 'success');

  // re-pop badge animation
  const badge = document.getElementById('cart-badge');
  badge.style.animation = 'none'; badge.offsetWidth;
  badge.style.animation = 'popIn .3s cubic-bezier(.175,.885,.32,1.275)';
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart(); updateCartUI(); renderCartItems();
  renderProducts(currentFilter === 'all' ? watches : watches.filter(w => w.category === currentFilter));
}

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  const w = watches.find(x => x.id === id);
  if (w) item.qty = Math.min(item.qty, w.stock);
  saveCart(); updateCartUI(); renderCartItems();
}

function saveCart() { localStorage.setItem('dw_cart', JSON.stringify(cart)); }
function getCartTotal() { return cart.reduce((s, c) => s + c.price * c.qty, 0); }

function updateCartUI() {
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const badge = document.getElementById('cart-badge');
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
  document.getElementById('cart-total-price').textContent = `${getCartTotal().toLocaleString()} EGP`;
}

function renderCartItems() {
  const container = document.getElementById('cart-items');
  const footer    = document.getElementById('cart-footer');
  if (!cart.length) {
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
           onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=72&q=60'" />
      <div class="cart-item-info">
        <div class="cart-item-name">${name}</div>
        <div class="cart-item-price">${(item.price * item.qty).toLocaleString()} EGP</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}',1)">+</button>
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
  if (!cart.length) { showToast(currentLang === 'ar' ? 'السلة فارغة!' : 'Cart is empty!', 'error'); return; }
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
  const sub      = getCartTotal();
  const discount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const total    = Math.max(0, sub - discount) + SHIPPING_FEE;
  document.getElementById('summary-sub').textContent   = `${sub.toLocaleString()} EGP`;
  document.getElementById('summary-total').textContent = `${total.toLocaleString()} EGP`;
  const row = document.getElementById('summary-discount-row');
  if (discount > 0) {
    row.classList.remove('hidden');
    document.getElementById('summary-discount').textContent = `-${discount} EGP`;
  } else row.classList.add('hidden');
}

function setupPaymentOpts() {
  document.querySelectorAll('.payment-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.payment-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      opt.querySelector('input').checked = true;
    });
  });
}

async function applyCoupon() {
  const code = document.getElementById('coupon-input').value.trim();
  const el   = document.getElementById('coupon-result');
  if (!code) return;
  try {
    const coupon = await DB.validateCoupon(code);
    if (coupon) {
      appliedCoupon = coupon;
      el.className = 'coupon-result coupon-ok';
      el.textContent = currentLang === 'ar' ? `✅ خصم ${coupon.discount_amount} EGP` : `✅ ${coupon.discount_amount} EGP off!`;
      updateOrderSummary();
    } else {
      el.className = 'coupon-result coupon-err';
      el.textContent = currentLang === 'ar' ? '❌ كود غير صحيح' : '❌ Invalid code';
      appliedCoupon = null; updateOrderSummary();
    }
  } catch { el.className = 'coupon-result coupon-err'; el.textContent = '❌ Error'; }
}

async function placeOrder() {
  const name    = document.getElementById('ship-name').value.trim();
  const phone   = document.getElementById('ship-phone').value.trim();
  const country = document.getElementById('ship-country').value;
  const city    = document.getElementById('ship-city').value.trim();
  const address = document.getElementById('ship-address').value.trim();
  const payment = document.querySelector('input[name="payment"]:checked')?.value || 'COD';

  if (!name || !phone || !city || !address) {
    showToast(currentLang === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', 'error'); return;
  }

  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.textContent = currentLang === 'ar' ? '⏳ جارٍ الحفظ...' : '⏳ Saving...';

  const sub      = getCartTotal();
  const discount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const total    = Math.max(0, sub - discount) + SHIPPING_FEE;

  try {
    const order = await DB.saveOrder({
      customer_name: name, phone, country, city, address,
      payment_method: payment, items: JSON.stringify(cart),
      subtotal: sub, discount, shipping: SHIPPING_FEE, total_price: total,
      coupon_used: appliedCoupon?.code || null, status: 'Pending'
    });

    const orderNum = `#DW-${String(order.id || Date.now()).slice(-6).toUpperCase()}`;
    const items    = cart.map(c => `• ${c.name} × ${c.qty}`).join('\n');
    const waMsg    = encodeURIComponent(
      `🛍 طلب جديد — Demo Watches\n━━━━━━\n${items}\n━━━━━━\n💰 ${total} EGP\n💳 ${payment}\n📦 ${city}, ${country}\n📱 ${phone}\n${orderNum}`
    );
    document.getElementById('whatsapp-link').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`;
    document.getElementById('confirm-order-num').textContent = orderNum;

    cart = []; saveCart(); updateCartUI(); appliedCoupon = null;
    closeCheckout();
    document.getElementById('confirm-modal').classList.add('open');
  } catch {
    showToast(currentLang === 'ar' ? '❌ حدث خطأ، حاول مجدداً' : '❌ Error, please retry', 'error');
  } finally {
    btn.disabled = false;
    btn.setAttribute('data-ar', '✅ تأكيد الطلب');
    btn.setAttribute('data-en', '✅ Confirm Order');
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
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 350); }, 3000);
}
