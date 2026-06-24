# ⌚ Demo Watches — E-Commerce Store

متجر ساعات فاخر بـ Public Store + Admin Dashboard

## 📁 File Structure
```
/
├── index.html              ← Public Store
├── admin/
│   ├── login.html          ← Admin Login
│   └── index.html          ← Admin Dashboard
├── css/
│   ├── style.css           ← Store Styles
│   └── admin.css           ← Dashboard Styles
├── js/
│   ├── supabase-config.js  ← DB Config (edit this!)
│   ├── app.js              ← Store Logic
│   └── admin.js            ← Admin Logic
└── README.md
```

## 🚀 Quick Start (Demo Mode — No Backend)
Just open `index.html` in a browser. Everything works with localStorage.

- **Admin login:** http://localhost/admin/login.html
- **Username:** `admin`  |  **Password:** `watches2024`

## 🔧 Connect to Supabase (Real Backend)

1. Go to [supabase.com](https://supabase.com) → Create project
2. Run these SQL scripts in the SQL Editor:

```sql
CREATE TABLE watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  name_ar VARCHAR,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR,
  description TEXT,
  description_ar TEXT,
  category VARCHAR CHECK (category IN ('Men','Women','Unisex')),
  stock INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR,
  phone VARCHAR,
  country VARCHAR,
  city VARCHAR,
  address TEXT,
  payment_method VARCHAR,
  items TEXT,
  subtotal DECIMAL(10,2),
  discount DECIMAL(10,2) DEFAULT 0,
  shipping DECIMAL(10,2) DEFAULT 50,
  total_price DECIMAL(10,2),
  coupon_used VARCHAR,
  status VARCHAR DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  uses_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert admin user (password: watches2024)
INSERT INTO admin_users (username, password_hash) VALUES ('admin', 'watches2024');

-- Enable RLS (Row Level Security)
ALTER TABLE watches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Public read for watches + coupons
CREATE POLICY "public_read_watches" ON watches FOR SELECT USING (true);
CREATE POLICY "public_insert_orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "public_read_coupons" ON coupons FOR SELECT USING (true);
```

3. Edit `js/supabase-config.js`:
```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'watches2024';    // Change this!
const WHATSAPP_NUMBER = '201001234567'; // Your WhatsApp number
```

## 📱 GitHub Pages Deploy

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/demo-watches.git
git push -u origin main
```

Then: GitHub repo → Settings → Pages → Source: main branch → Save.

Your site will be live at: `https://YOUR_USER.github.io/demo-watches/`

## ✨ Features
- 🌐 Arabic + English UI (toggle)
- 📱 Mobile responsive
- 🛒 Cart + Checkout flow
- 💳 InstaPay / Vodafone Cash / COD
- 🎁 Coupon system
- 📊 Admin analytics + Chart.js
- 🔐 Admin auth (localStorage session)
- ⚡ Supabase real-time OR localStorage demo mode
