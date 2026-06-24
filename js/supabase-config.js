// ============================================================
//  SUPABASE CONFIG — replace with your project credentials
//  Go to: https://supabase.com → Project Settings → API
// ============================================================
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';

// Admin credentials (change these!)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'watches2024';

// WhatsApp number for order confirmation
const WHATSAPP_NUMBER = '201000000000'; // e.g. 201001234567

// Shipping fee
const SHIPPING_FEE = 50;

// ============================================================
//  Supabase Client Init
// ============================================================
let supabaseClient = null;

function initSupabase() {
  if (typeof window !== 'undefined' && window.supabase && SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase connected');
    return true;
  }
  console.warn('⚠️ Running in demo mode (localStorage). Add Supabase credentials to enable real backend.');
  return false;
}

// ============================================================
//  Demo Data (used when Supabase is not configured)
// ============================================================
const DEMO_WATCHES = [
  {
    id: '1',
    name: 'Royal Classic',
    name_ar: 'رويال كلاسيك',
    price: 1800,
    image_url: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=600&q=80',
    description: 'A timeless masterpiece crafted for the distinguished gentleman. Swiss movement, sapphire crystal glass.',
    description_ar: 'تحفة فنية خالدة صُممت للرجل المتميز. حركة سويسرية وزجاج كريستال ياقوتي.',
    category: 'Men',
    stock: 15,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Golden Elegance',
    name_ar: 'ذهبية الأناقة',
    price: 2200,
    image_url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&q=80',
    description: 'Elegance redefined. Rose gold finish with mother-of-pearl dial, perfect for every occasion.',
    description_ar: 'أناقة لا مثيل لها. تشطيب من الذهب الوردي مع لوح لؤلؤي، مثالية لكل مناسبة.',
    category: 'Women',
    stock: 10,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Midnight Luxe',
    name_ar: 'منتصف الليل الفاخرة',
    price: 1950,
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
    description: 'Dark dial meets golden indices. The ultimate unisex statement piece.',
    description_ar: 'لوح داكن مع مؤشرات ذهبية. القطعة الأنيقة للجنسين.',
    category: 'Unisex',
    stock: 8,
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Pearl Shine',
    name_ar: 'لمعة اللؤلؤ',
    price: 2500,
    image_url: 'https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=600&q=80',
    description: 'Adorned with genuine pearl accents and a diamond-cut bezel. Luxury at its finest.',
    description_ar: 'مزينة بلمسات لؤلؤية حقيقية وحافة مقطوعة كالماس. فخامة في أجمل صورها.',
    category: 'Women',
    stock: 5,
    created_at: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Steel Master',
    name_ar: 'سيد الستيل',
    price: 1700,
    image_url: 'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=600&q=80',
    description: 'Brushed stainless steel, 100m water resistance. Built for the modern achiever.',
    description_ar: 'ستيل مصقول مقاوم للماء 100 متر. صُنعت للمنجز الحديث.',
    category: 'Men',
    stock: 20,
    created_at: new Date().toISOString()
  }
];

// ============================================================
//  Generic DB wrapper (Supabase OR localStorage fallback)
// ============================================================
const DB = {
  // -- WATCHES --
  async getWatches() {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('watches').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    const stored = localStorage.getItem('watches');
    return stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEMO_WATCHES));
  },

  async saveWatch(watch) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('watches').upsert(watch).select().single();
      if (error) throw error;
      return data;
    }
    const watches = await this.getWatches();
    const idx = watches.findIndex(w => w.id === watch.id);
    if (idx >= 0) watches[idx] = watch;
    else watches.unshift({ ...watch, id: crypto.randomUUID(), created_at: new Date().toISOString() });
    localStorage.setItem('watches', JSON.stringify(watches));
    return watch;
  },

  async deleteWatch(id) {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('watches').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const watches = (await this.getWatches()).filter(w => w.id !== id);
    localStorage.setItem('watches', JSON.stringify(watches));
  },

  // -- ORDERS --
  async getOrders() {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    const stored = localStorage.getItem('orders');
    return stored ? JSON.parse(stored) : [];
  },

  async saveOrder(order) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('orders').insert(order).select().single();
      if (error) throw error;
      return data;
    }
    const orders = await this.getOrders();
    const newOrder = { ...order, id: crypto.randomUUID(), status: 'Pending', created_at: new Date().toISOString() };
    orders.unshift(newOrder);
    localStorage.setItem('orders', JSON.stringify(orders));
    return newOrder;
  },

  async updateOrderStatus(id, status) {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
      return;
    }
    const orders = await this.getOrders();
    const order = orders.find(o => o.id === id);
    if (order) order.status = status;
    localStorage.setItem('orders', JSON.stringify(orders));
  },

  // -- COUPONS --
  async getCoupons() {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('coupons').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    const stored = localStorage.getItem('coupons');
    return stored ? JSON.parse(stored) : [
      { id: '1', code: 'WELCOME10', discount_amount: 10, uses_count: 0, created_at: new Date().toISOString() },
      { id: '2', code: 'GOLD20', discount_amount: 20, uses_count: 0, created_at: new Date().toISOString() }
    ];
  },

  async saveCoupon(coupon) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('coupons').insert(coupon).select().single();
      if (error) throw error;
      return data;
    }
    const coupons = await this.getCoupons();
    const newCoupon = { ...coupon, id: crypto.randomUUID(), uses_count: 0, created_at: new Date().toISOString() };
    coupons.unshift(newCoupon);
    localStorage.setItem('coupons', JSON.stringify(coupons));
    return newCoupon;
  },

  async deleteCoupon(id) {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('coupons').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const coupons = (await this.getCoupons()).filter(c => c.id !== id);
    localStorage.setItem('coupons', JSON.stringify(coupons));
  },

  async validateCoupon(code) {
    const coupons = await this.getCoupons();
    return coupons.find(c => c.code.toUpperCase() === code.toUpperCase()) || null;
  }
};
