/* ============================================================
   DEMO WATCHES V3 — Public Store Logic
   ============================================================ */

let cart          = JSON.parse(localStorage.getItem('dw_cart') || '[]');
let watches       = [];
let currentFilter = 'all';
let currentLang   = localStorage.getItem('dw_lang') || 'ar';
let appliedCoupon = null;

// ── Carousel ───────────────────────────────────────────────
let slideIdx   = 0;
let slideTotal = 0;
let slideTimer = null;
const SLIDE_MS = 5000;

function initCarousel() {
  slideTotal = document.querySelectorAll('.carousel-slide').length;
  if (slideTotal > 1) startTimer();

  // touch swipe
  let tx = 0;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  hero.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) { dx < 0 ? nextSlide() : prevSlide(); resetTimer(); }
  }, { passive: true });
}

function goToSlide(i) {
  document.querySelectorAll('.carousel-slide').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
  slideIdx = (i + slideTotal) % slideTotal;
  document.getElementById(`slide-${slideIdx}`)?.classList.add('active');
  document.querySelectorAll('.dot')[slideIdx]?.classList.add('active');
}
function nextSlide() { goToSlide(slideIdx + 1); resetTimer(); }
function prevSlide() { goToSlide(slideIdx - 1); resetTimer(); }
function startTimer()  { slideTimer = setInterval(() => goToSlide(slideIdx + 1), SLIDE_MS); }
function resetTimer()  { clearInterval(slideTimer); startTimer(); }

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  nextSlide();
  if (e.key === 'ArrowRight') prevSlide();
});

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  applyLang(currentLang);
  setupFilters();
  setupPayOpts();
  updateCartUI();
  initCarousel();
  initScrollReveal();
  initScrollHeader();

  try {
    watches = await DB.getWatches();
  } catch {
    watches = JSON.parse(JSON.stringify(DEMO_WATCHES));
  }
  renderProducts(watches);

  setTimeout(() => document.getElementById('loading-overlay').classList.add('fade-out'), 700);
});

// ── Scroll header shadow ───────────────────────────────────
function initScrollHeader() {
  window.addEventListener('scroll', () => {
    document.getElementById('header').classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

// ── Scroll Reveal ──────────────────────────────────────────
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  const io  = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: .12 });
  els.forEach(el => io.observe(el));
}

// ── Language ───────────────────────────────────────────────
function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('dw_lang', lang);
  const ar = lang === 'ar';
  document.documentElement.lang = lang;
  document.documentElement.dir  = ar ? 'rtl' : 'ltr';
  document.getElementById('lang-btn').textContent = ar ? 'EN' : 'ع';

  document.querySelectorAll('[data-ar]').forEach(el => {
    const v = el.getAttribute(`data-${lang}`);
    if (!v) return;
    if (v.includes('<')) el.innerHTML = v; else el.textContent = v;
  });

  const nl = document.getElementById('nl-email');
  if (nl) nl.placeholder = ar ? 'بريدك الإلكتروني' : 'Your email address';

  const list = currentFilter === 'all' ? watches : watches.filter(w => w.category === currentFilter);
  renderProducts(list);
  renderCartItems();
}

document.getElementById('lang-btn').addEventListener('click', () => applyLang(currentLang === 'ar' ? 'en' : 'ar'));

// ── Mobile Nav ─────────────────────────────────────────────
document.getElementById('menu-btn').addEventListener('click', () => document.getElementById('mobile-nav').classList.add('open'));
document.getElementById('mobile-nav-x').addEventListener('click', closeMobileNav);
function closeMobileNav() { document.getElementById('mobile-nav').classList.remove('open'); }

// ── Filters ────────────────────────────────────────────────
function setupFilters() {
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
  if (!list?.length) {
    grid.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--muted);grid-column:1/-1">
      <div style="font-size:2.4rem;opacity:.2;margin-bottom:12px">⌚</div>
      <p>${currentLang === 'ar' ? 'لا توجد منتجات في هذا التصنيف' : 'No products in this category'}</p>
    </div>`;
    return;
  }
  grid.innerHTML = list.map((w, i) => {
    const name   = currentLang === 'ar' ? (w.name_ar || w.name) : w.name;
    const desc   = currentLang === 'ar' ? (w.description_ar || w.description) : w.description;
    const inCart = cart.some(c => c.id === w.id);
    const noStk  = w.stock <= 0;
    const catMap = { Men:{ ar:'للرجال', en:'Men' }, Women:{ ar:'للنساء', en:'Women' }, Unisex:{ ar:'يونيسيكس', en:'Unisex' } };
    const cat    = catMap[w.category]?.[currentLang] || w.category;

    return `
    <div class="product-card" style="animation:fadeCard .4s ${i*.06}s both">
      ${i < 3 ? `<div class="product-badge">${currentLang === 'ar' ? '⭐ الأكثر مبيعاً' : '⭐ Best Seller'}</div>` : ''}
      <div class="product-img-wrap">
        <img src="${w.image_url}" alt="${name}" loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'" />
      </div>
      <div class="product-info">
        <div class="product-cat">${cat}</div>
        <div class="product-name">${name}</div>
        <div class="product-desc">${desc || ''}</div>
        <div class="product-footer">
          <div class="product-price">${Number(w.price).toLocaleString()} <small>EGP</small></div>
          ${noStk
            ? `<button class="add-cart-btn" disabled title="${currentLang === 'ar' ? 'نفدت الكمية' : 'Out of Stock'}">✕</button>`
            : `<button class="add-cart-btn" onclick="addToCart('${w.id}')" title="${currentLang === 'ar' ? 'أضف للسلة' : 'Add to Cart'}">
                 ${inCart ? '✓' : '+'}
               </button>`}
        </div>
      </div>
    </div>`;
  }).join('');
}

// inject keyframe once
if (!document.getElementById('_kf')) {
  const s = document.createElement('style');
  s.id = '_kf';
  s.textContent = '@keyframes fadeCard{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(s);
}

// ── Cart Logic ─────────────────────────────────────────────
function addToCart(id) {
  const w  = watches.find(x => x.id === id);
  if (!w) return;
  const ex = cart.find(c => c.id === id);
  if (ex) ex.qty = Math.min(ex.qty + 1, w.stock);
  else cart.push({ id, qty: 1, name: w.name, name_ar: w.name_ar, price: w.price, image_url: w.image_url });
  saveCart(); updateCartUI();
  renderProducts(currentFilter === 'all' ? watches : watches.filter(x => x.category === currentFilter));
  toast(currentLang === 'ar' ? '✅ تمت الإضافة للسلة' : '✅ Added to cart', 'success');

  const b = document.getElementById('cart-badge');
  b.style.animation = 'none'; b.offsetWidth;
  b.style.animation = 'pop .3s cubic-bezier(.175,.885,.32,1.275)';
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart(); updateCartUI(); renderCartItems();
  renderProducts(currentFilter === 'all' ? watches : watches.filter(x => x.category === currentFilter));
}

function changeQty(id, d) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + d);
  const w = watches.find(x => x.id === id);
  if (w) item.qty = Math.min(item.qty, w.stock);
  saveCart(); updateCartUI(); renderCartItems();
}

function saveCart()    { localStorage.setItem('dw_cart', JSON.stringify(cart)); }
function cartSubtotal(){ return cart.reduce((s, c) => s + c.price * c.qty, 0); }

function updateCartUI() {
  const n = cart.reduce((s, c) => s + c.qty, 0);
  const b = document.getElementById('cart-badge');
  b.textContent = n; b.classList.toggle('hidden', n === 0);
  document.getElementById('cart-total').textContent = `${cartSubtotal().toLocaleString()} EGP`;
}

function renderCartItems() {
  const wrap = document.getElementById('cart-items');
  const foot = document.getElementById('cart-foot');
  if (!cart.length) {
    wrap.innerHTML = `<div class="cart-empty">
      <div class="cart-empty-icon">🛒</div>
      <p>${currentLang === 'ar' ? 'سلتك فارغة' : 'Your cart is empty'}</p>
    </div>`;
    foot.style.display = 'none'; return;
  }
  foot.style.display = 'block';
  wrap.innerHTML = cart.map(item => {
    const name = currentLang === 'ar' ? (item.name_ar || item.name) : item.name;
    return `
    <div class="cart-item">
      <img class="cart-img" src="${item.image_url}" alt="${name}"
           onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=72&q=60'" />
      <div class="cart-info">
        <div class="cart-name">${name}</div>
        <div class="cart-price">${(item.price * item.qty).toLocaleString()} EGP</div>
        <div class="cart-qty">
          <button class="qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
          <span class="qty-n">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}',1)">+</button>
          <button class="remove" onclick="removeFromCart('${item.id}')">${currentLang === 'ar' ? 'إزالة' : 'Remove'}</button>
        </div>
      </div>
    </div>`;
  }).join('');
  document.getElementById('cart-total').textContent = `${cartSubtotal().toLocaleString()} EGP`;
}

// Cart open/close
document.getElementById('cart-btn').addEventListener('click', openCart);
function openCart()  { renderCartItems(); document.getElementById('cart-sidebar').classList.add('open'); document.getElementById('cart-overlay').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeCart() { document.getElementById('cart-sidebar').classList.remove('open'); document.getElementById('cart-overlay').classList.remove('open'); document.body.style.overflow = ''; }

// ── Checkout ───────────────────────────────────────────────
function openCheckout() {
  if (!cart.length) { toast(currentLang === 'ar' ? 'السلة فارغة!' : 'Cart is empty!', 'error'); return; }
  closeCart(); updateSummary();
  document.getElementById('checkout-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCheckout() { document.getElementById('checkout-modal').classList.remove('open'); document.body.style.overflow = ''; }

function updateSummary() {
  const sub  = cartSubtotal();
  const disc = appliedCoupon?.discount_amount || 0;
  const tot  = Math.max(0, sub - disc) + SHIPPING_FEE;
  document.getElementById('sum-sub').textContent   = `${sub.toLocaleString()} EGP`;
  document.getElementById('sum-total').textContent = `${tot.toLocaleString()} EGP`;
  const row = document.getElementById('sum-disc-row');
  if (disc > 0) { row.classList.remove('hidden'); document.getElementById('sum-disc').textContent = `-${disc} EGP`; }
  else row.classList.add('hidden');
}

function setupPayOpts() {
  document.querySelectorAll('.pay-opt').forEach(o => {
    o.addEventListener('click', () => {
      document.querySelectorAll('.pay-opt').forEach(x => x.classList.remove('on'));
      o.classList.add('on'); o.querySelector('input').checked = true;
    });
  });
}

async function applyCoupon() {
  const code = document.getElementById('coupon-input').value.trim();
  const msg  = document.getElementById('coupon-msg');
  if (!code) return;
  try {
    const c = await DB.validateCoupon(code);
    if (c) {
      appliedCoupon = c;
      msg.className = 'coupon-msg coupon-ok';
      msg.textContent = currentLang === 'ar' ? `✅ خصم ${c.discount_amount} EGP` : `✅ ${c.discount_amount} EGP off!`;
    } else {
      msg.className = 'coupon-msg coupon-err';
      msg.textContent = currentLang === 'ar' ? '❌ كود غير صحيح' : '❌ Invalid code';
      appliedCoupon = null;
    }
    updateSummary();
  } catch { msg.className = 'coupon-msg coupon-err'; msg.textContent = '❌ Error'; }
}

async function placeOrder() {
  const name    = document.getElementById('s-name').value.trim();
  const phone   = document.getElementById('s-phone').value.trim();
  const country = document.getElementById('s-country').value;
  const city    = document.getElementById('s-city').value.trim();
  const address = document.getElementById('s-address').value.trim();
  const payment = document.querySelector('input[name="pay"]:checked')?.value || 'COD';

  if (!name || !phone || !city || !address) {
    toast(currentLang === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', 'error'); return;
  }

  const btn = document.getElementById('place-btn');
  btn.disabled = true; btn.textContent = currentLang === 'ar' ? '⏳ جارٍ الحفظ...' : '⏳ Saving...';

  const sub  = cartSubtotal();
  const disc = appliedCoupon?.discount_amount || 0;
  const tot  = Math.max(0, sub - disc) + SHIPPING_FEE;

  try {
    const order = await DB.saveOrder({
      customer_name: name, phone, country, city, address,
      payment_method: payment, items: JSON.stringify(cart),
      subtotal: sub, discount: disc, shipping: SHIPPING_FEE, total_price: tot,
      coupon_used: appliedCoupon?.code || null, status: 'Pending'
    });

    const num   = `#DW-${String(order.id || Date.now()).slice(-6).toUpperCase()}`;
    const items = cart.map(c => `• ${c.name} × ${c.qty}`).join('\n');
    const waMsg = encodeURIComponent(`🛍 طلب — Demo Watches\n━━━━\n${items}\n━━━━\n💰 ${tot} EGP | 💳 ${payment}\n📦 ${city}, ${country}\n📱 ${phone}\n${num}`);

    document.getElementById('wa-link').href  = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`;
    document.getElementById('confirm-num').textContent = num;

    cart = []; saveCart(); updateCartUI(); appliedCoupon = null;
    closeCheckout();
    document.getElementById('confirm-modal').classList.add('open');
  } catch {
    toast(currentLang === 'ar' ? '❌ حدث خطأ، حاول مجدداً' : '❌ Error, please retry', 'error');
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
  toast(currentLang === 'ar' ? '🎉 شكراً للاشتراك!' : '🎉 Thanks for subscribing!', 'success');
  document.getElementById('nl-email').value = '';
}

// ── Toast ──────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const wrap = document.getElementById('toast-wrap');
  const el   = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3000);
}
