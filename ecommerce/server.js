const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "rift_thrift_curated_raw_secret_token_key_2026";

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// ─── Vercel: wait for DB init before handling any request ─────────────────────
let _dbReady = null;
app.use(async (req, res, next) => {
    if (_dbReady) await _dbReady;
    next();
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Vercel serverless: keep max connections low to avoid exhausting DB pool
    max: process.env.NODE_ENV === 'production' ? 1 : 10,
});

const mailer = (process.env.EMAIL_USER && process.env.EMAIL_PASS)
    ? nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } })
    : null;

const STORE_EMAIL = process.env.EMAIL_USER || 'noreply@riftthrift.pk';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

// ─── Database Init ─────────────────────────────────────────────────────────────
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY, name TEXT, username TEXT UNIQUE,
            email TEXT UNIQUE, phone TEXT, password TEXT,
            role TEXT DEFAULT 'user', created_at TIMESTAMP DEFAULT NOW()
        )`);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY, name TEXT, email TEXT, phone TEXT, address TEXT,
            subtotal NUMERIC, shipping NUMERIC, discount NUMERIC DEFAULT 0, total NUMERIC,
            coupon_code TEXT, status TEXT DEFAULT 'Pending', items TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS coupons (
            id SERIAL PRIMARY KEY, code TEXT UNIQUE, discount_type TEXT DEFAULT 'percent',
            discount_value NUMERIC, min_order NUMERIC DEFAULT 0, is_active BOOLEAN DEFAULT true,
            usage_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW()
        )`);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            gender TEXT NOT NULL,
            category TEXT NOT NULL,
            price NUMERIC NOT NULL,
            sale_price NUMERIC DEFAULT NULL,
            sale_type TEXT DEFAULT '',
            color TEXT DEFAULT '',
            color_hex TEXT DEFAULT '#000000',
            description TEXT DEFAULT '',
            images TEXT DEFAULT '[]',
            sizes TEXT DEFAULT '["S","M","L","XL"]',
            unavailable_sizes TEXT DEFAULT '[]',
            is_best_seller BOOLEAN DEFAULT false,
            is_new BOOLEAN DEFAULT false,
            is_flash_sale BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )`);
    await seedAdmin();
    await seedDefaultCoupons();
    await seedProducts();
    console.log('Rift Thrift DB ready.');
}

async function seedAdmin() {
    const adminEmail = 'moiz3996317@gmail.com';
    const hashed = bcrypt.hashSync('moizmoiz08', 10);
    // ON CONFLICT DO NOTHING — never overwrite an existing admin (safe on serverless cold starts)
    await pool.query(
        `INSERT INTO users (name, username, email, phone, password, role)
         VALUES ($1, $2, $3, $4, $5, 'admin') ON CONFLICT (email) DO NOTHING`,
        ['Moiz Admin', 'moizadmin', adminEmail, '+923001234567', hashed]
    );
    console.log('Admin ready: moiz3996317@gmail.com');
}

async function seedDefaultCoupons() {
    const coupons = [
        { code: 'WELCOME10', type: 'percent', value: 10, min: 0 },
        { code: 'RIFT20', type: 'percent', value: 20, min: 1000 },
        { code: 'FLAT200', type: 'fixed', value: 200, min: 500 },
    ];
    for (const c of coupons) {
        await pool.query(
            `INSERT INTO coupons (code, discount_type, discount_value, min_order)
             VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING`,
            [c.code, c.type, c.value, c.min]
        );
    }
}

async function seedProducts() {
    const { rows } = await pool.query(`SELECT COUNT(*) FROM products`);
    if (parseInt(rows[0].count) > 0) return;
    const initialProducts = [
        { name: 'Classic Indigo Denim', gender: 'Men', cat: 'Denim', isBestSeller: true, isNew: false, isFlashSale: false, saleType: '', price: 1450, color: 'Dark Blue', colorHex: '#1e3a8a', desc: 'A timeless classic indigo denim tailored for a perfect fit.', images: ['https://i.ibb.co/FtvPG7V/1777643485852-2.jpg','https://i.ibb.co/Rk2YHYHJ/1777643485852-3.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 1 },
        { name: 'Baggy Cloud Grey', gender: 'Men', cat: 'Cloud Baggy', isBestSeller: true, isNew: true, isFlashSale: false, saleType: '', price: 1750, color: 'Grey', colorHex: '#9ca3af', desc: 'Experience ultimate comfort with our signature baggy fit.', images: ['https://i.ibb.co/Rpf9ry0V/1777643485852-4.jpg','https://i.ibb.co/RGdV978P/1777643485852-5.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 2 },
        { name: 'Midnight Skinny Fit', gender: 'Men', cat: 'Skinny', isBestSeller: false, isNew: true, isFlashSale: true, saleType: 'Flash Sale', price: 1300, sale_price: 999, color: 'Black', colorHex: '#000000', desc: 'Sleek midnight black skinny jeans featuring stretchable fabric.', images: ['https://i.ibb.co/HpYF7xZv/1777646614740-4.jpg','https://i.ibb.co/4LHSsFB/1777646614740-5.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 3 },
        { name: 'Cargo Summer Shorts', gender: 'Men', cat: 'Shorts', isBestSeller: false, isNew: false, isFlashSale: true, saleType: 'Flash Sale', price: 850, sale_price: 650, color: 'Khaki', colorHex: '#d2b48c', desc: 'Breathable cargo shorts equipped with multi-pocket utility.', images: ['https://i.ibb.co/1t3fGpSY/1777646614740-2.jpg','https://i.ibb.co/JTpwXVk/1777646614740-3.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 4 },
        { name: 'High Waist Mom Denim', gender: 'Women', cat: 'Denim', isBestSeller: true, isNew: false, isFlashSale: false, saleType: '', price: 1600, color: 'Light Blue', colorHex: '#93c5fd', desc: 'Vintage-inspired high waist mom jeans offering a flattering silhouette.', images: ['https://i.ibb.co/1trshmtP/1777644849044-3.jpg','https://i.ibb.co/mWsy1Yw/1777644849044-4.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 5 },
        { name: 'Women Cloud Baggy', gender: 'Women', cat: 'Cloud Baggy', isBestSeller: true, isNew: true, isFlashSale: true, saleType: 'Flash Sale', price: 1850, sale_price: 1499, color: 'Beige', colorHex: '#f5f5dc', desc: 'Our famous cloud baggy jeans, effortlessly chic.', images: ['https://i.ibb.co/FLmBc1ht/1777644849044-5.jpg','https://i.ibb.co/847fZcVZ/1777644849044-2.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 6 },
        { name: 'Stretch Skinny Black', gender: 'Women', cat: 'Skinny', isBestSeller: false, isNew: true, isFlashSale: false, saleType: '', price: 1400, color: 'Black', colorHex: '#000000', desc: 'Form-fitting black stretch skinny jeans to contour your shape perfectly.', images: ['https://i.ibb.co/C32RXN4W/1777646811161-2.jpg','https://i.ibb.co/0RqpkmkM/1777646811161-3.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 7 },
        { name: 'Vintage Denim Shorts', gender: 'Women', cat: 'Shorts', isBestSeller: false, isNew: false, isFlashSale: true, saleType: 'Flash Sale', price: 950, sale_price: 750, color: 'Blue', colorHex: '#3b82f6', desc: 'Classic cut-off denim shorts boasting frayed edges.', images: ['https://i.ibb.co/s4vQvY4/1777646811161-4.jpg','https://i.ibb.co/qFy9tvhD/1777646811161-6.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 8 },
        { name: 'Junior Rugged Denim', gender: 'Kids', cat: 'Denim', isBestSeller: true, isNew: false, isFlashSale: false, saleType: '', price: 1100, color: 'Blue', colorHex: '#2563eb', desc: 'Durable and play-ready rugged denim for active kids.', images: ['https://i.ibb.co/ycnKD4KZ/Chat-GPT-Image-May-1-2026-08-41-38-PM-2.jpg','https://i.ibb.co/zHj3Cx9z/Chat-GPT-Image-May-1-2026-08-41-38-PM-3.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 9 },
        { name: 'Kids Baggy Cloud', gender: 'Kids', cat: 'Baggy', isBestSeller: true, isNew: true, isFlashSale: true, saleType: 'Flash Sale', price: 1200, sale_price: 950, color: 'Blue Wash', colorHex: '#60a5fa', desc: 'A miniature version of our famous baggy cloud jeans.', images: ['https://i.ibb.co/LXyntFQG/Chat-GPT-Image-May-1-2026-08-41-38-PM-4.jpg','https://i.ibb.co/cSRHFzVZ/Chat-GPT-Image-May-1-2026-08-41-38-PM-5.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 10 },
        { name: 'Junior Skinny Fit', gender: 'Kids', cat: 'Skinny', isBestSeller: false, isNew: true, isFlashSale: false, saleType: '', price: 900, color: 'Black', colorHex: '#111827', desc: 'Trendy skinny jeans for kids featuring an adjustable waist.', images: ['https://i.ibb.co/MyGJ3Drv/Chat-GPT-Image-May-1-2026-08-47-21-PM-4.jpg','https://i.ibb.co/dsQCKQ16/Chat-GPT-Image-May-1-2026-08-47-21-PM-5.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 11 },
        { name: 'Active Play Shorts', gender: 'Kids', cat: 'Shorts', isBestSeller: false, isNew: false, isFlashSale: true, saleType: 'Flash Sale', price: 650, sale_price: 499, color: 'Olive', colorHex: '#4d7c0f', desc: 'Lightweight olive shorts designed specifically for playground fun.', images: ['https://i.ibb.co/mPbHCLD/Chat-GPT-Image-May-1-2026-08-47-21-PM-2.jpg','https://i.ibb.co/mQVQNNb/Chat-GPT-Image-May-1-2026-08-47-21-PM-3.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 12 },
        { name: 'Summer Breeze Shorts', gender: 'Men', cat: 'Shorts', isBestSeller: true, isNew: false, isFlashSale: true, saleType: 'Flash Sale', price: 500, sale_price: 399, color: 'Yellow', colorHex: '#facc15', desc: 'Brighten up your seasonal wardrobe with these vibrant yellow shorts.', images: ['https://i.ibb.co/VWwns5Kx/1777647507787-2.jpg','https://i.ibb.co/N6nMh35N/1777647507787-3.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 13 },
        { name: 'Summer Linen Pant', gender: 'Women', cat: 'Baggy', isBestSeller: false, isNew: true, isFlashSale: false, saleType: '', price: 800, color: 'White', colorHex: '#ffffff', desc: 'Airy and elegant white linen pants for warm days.', images: ['https://i.ibb.co/x8PhP2dv/1777647507787-4.jpg','https://i.ibb.co/qvH6rBy/1777647507787-5.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 14 },
        { name: 'Thick Winter Denim', gender: 'Men', cat: 'Denim', isBestSeller: true, isNew: false, isFlashSale: false, saleType: '', price: 900, color: 'Black Wash', colorHex: '#374151', desc: 'Heavyweight black wash denim perfectly crafted to keep you well insulated.', images: ['https://i.ibb.co/HDYbvkhb/1777647855994-2.jpg','https://i.ibb.co/fGrxw8kk/1777647855994-3.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 15 },
        { name: 'Fleece Lined Jeans', gender: 'Women', cat: 'Denim', isBestSeller: true, isNew: true, isFlashSale: true, saleType: 'Flash Sale', price: 950, sale_price: 750, color: 'Dark Blue', colorHex: '#1e3a8a', desc: 'Stay warm without sacrificing any style. Cozy fleece interior lining.', images: ['https://i.ibb.co/TDm4FXGk/1777647855994-4.jpg','https://i.ibb.co/bg5BJTJQ/1777647855994-5.jpg','https://i.ibb.co/KzhP9FgW/Screenshot-20260501-002546-4.jpg'], sort: 16 },
    ];
    for (const p of initialProducts) {
        await pool.query(
            `INSERT INTO products (name, gender, category, price, sale_price, sale_type, color, color_hex, description, images, is_best_seller, is_new, is_flash_sale, is_active, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,$14)`,
            [p.name, p.gender, p.cat, p.price, p.sale_price || null, p.saleType || '', p.color, p.colorHex, p.desc, JSON.stringify(p.images), p.isBestSeller, p.isNew, p.isFlashSale, p.sort]
        );
    }
}

// ─── Email Templates ────────────────────────────────────────────────────────────
function buildOrderEmail(order, items) {
    const rows = items.map(it => `<tr><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${it.product_name}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">${it.size}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;">x${it.quantity}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;font-weight:bold;">Rs. ${it.price * it.quantity}</td></tr>`).join('');
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px">
    <div style="background:#000;padding:24px;text-align:center;margin-bottom:20px">
        <h1 style="color:#fff;margin:0;letter-spacing:4px;font-size:18px">RIFT THRIFT</h1>
        <p style="color:rgba(255,255,255,0.4);margin:4px 0 0;font-size:11px;letter-spacing:2px">ORDER CONFIRMED</p>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #e5e5e5">
        <p style="font-size:13px;color:#555">Hello <strong>${order.name}</strong>, your order <strong>#${order.id}</strong> has been placed successfully!</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0"><thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:left;font-size:11px">Item</th><th style="padding:8px;text-align:left;font-size:11px">Size</th><th style="padding:8px;text-align:left;font-size:11px">Qty</th><th style="padding:8px;text-align:left;font-size:11px">Price</th></tr></thead><tbody>${rows}</tbody></table>
        <div style="border-top:2px solid #000;padding-top:12px;text-align:right"><p style="margin:4px 0;font-size:12px;color:#888">Shipping: Rs. ${order.shipping}</p>${order.discount>0?`<p style="margin:4px 0;font-size:12px;color:green">Discount: -Rs. ${order.discount}</p>`:''}<p style="margin:8px 0 0;font-size:16px;font-weight:bold">Total: Rs. ${order.total}</p></div>
        <div style="margin-top:20px;padding:12px;background:#f9f9f9;border-radius:4px"><p style="margin:0;font-size:12px;color:#555"><strong>Delivery Address:</strong> ${order.address}</p></div>
        <p style="font-size:11px;color:#999;margin-top:16px">Expected delivery in 3-5 business days. Payment: Cash on Delivery.</p>
    </div>
    <p style="text-align:center;font-size:10px;color:#aaa;margin-top:12px">© RIFT THRIFT CLOTHING — Karachi, Pakistan</p>
    </body></html>`;
}

function buildStatusEmail(order, newStatus) {
    const statusMsg = { Shipped: 'Your order is on the way!', Delivered: 'Your order has been delivered!', Cancelled: 'Your order has been cancelled.' };
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
    <div style="background:#000;padding:24px;text-align:center"><h1 style="color:#fff;margin:0;letter-spacing:4px;font-size:18px">RIFT THRIFT</h1></div>
    <div style="padding:24px;border:1px solid #e5e5e5;margin-top:8px">
        <h2 style="font-size:16px">Order #${order.id} — ${newStatus}</h2>
        <p style="color:#555;font-size:13px">Hello ${order.name}, ${statusMsg[newStatus] || 'Your order status has been updated.'}</p>
        <p style="font-size:12px;color:#888">Shipping to: ${order.address}</p>
    </div></body></html>`;
}

// ─── Auth Middleware ─────────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided.' });
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch { return res.status(403).json({ error: 'Invalid or expired token.' }); }
}
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    next();
}

// ─── Public: Products ────────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM products WHERE is_active = true ORDER BY sort_order ASC, id ASC`);
        res.json(rows.map(p => ({
            ...p,
            images: JSON.parse(p.images || '[]'),
            sizes: JSON.parse(p.sizes || '["S","M","L","XL"]'),
            unavailable_sizes: JSON.parse(p.unavailable_sizes || '[]'),
        })));
    } catch(e) { res.status(500).json({ error: 'Failed to load products.' }); }
});

// ─── Auth Routes ─────────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
    const { name, username, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing required fields.' });
    try {
        const hashed = bcrypt.hashSync(password, 10);
        const { rows } = await pool.query(
            `INSERT INTO users (name, username, email, phone, password) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role`,
            [name, username || null, email, phone || '', hashed]
        );
        const token = jwt.sign({ id: rows[0].id, email, role: rows[0].role }, JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ token, user: rows[0] });
    } catch(e) { res.status(400).json({ error: e.code === '23505' ? 'Email or username already in use.' : 'Registration failed.' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
    try {
        const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (!rows.length || !bcrypt.compareSync(password, rows[0].password))
            return res.status(401).json({ error: 'Invalid email or password.' });
        const u = rows[0];
        const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: u.id, name: u.name, email: u.email, username: u.username, phone: u.phone, role: u.role } });
    } catch(e) { res.status(500).json({ error: 'Login failed.' }); }
});

// ─── Coupon Routes ────────────────────────────────────────────────────────────────
app.post('/api/coupons/apply', async (req, res) => {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required.' });
    try {
        const { rows } = await pool.query(`SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND is_active = true`, [code]);
        if (!rows.length) return res.json({ valid: false, error: 'Invalid or expired promo code.' });
        const c = rows[0];
        if (subtotal < parseFloat(c.min_order)) return res.json({ valid: false, error: `Minimum order Rs. ${c.min_order} required for this code.` });
        let discountAmt = c.discount_type === 'percent'
            ? Math.round((subtotal * parseFloat(c.discount_value)) / 100)
            : parseFloat(c.discount_value);
        discountAmt = Math.min(discountAmt, subtotal);
        res.json({ valid: true, code: c.code, discount_type: c.discount_type, discount_value: parseFloat(c.discount_value), discount_amount: discountAmt });
    } catch(e) { res.status(500).json({ error: 'Failed to validate coupon.' }); }
});

// ─── Order Routes ─────────────────────────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
    const { name, email, phone, address, subtotal, shipping, discount, total, coupon_code, items } = req.body;
    if (!name || !phone || !address || !items?.length) return res.status(400).json({ error: 'Missing required fields.' });
    try {
        const { rows } = await pool.query(
            `INSERT INTO orders (name,email,phone,address,subtotal,shipping,discount,total,coupon_code,items)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
            [name, email, phone, address, subtotal, shipping, discount || 0, total, coupon_code || null, JSON.stringify(items)]
        );
        const orderId = rows[0].id;
        if (coupon_code) await pool.query(`UPDATE coupons SET usage_count = usage_count + 1 WHERE UPPER(code) = UPPER($1)`, [coupon_code]);
        if (mailer && email) {
            const fullOrder = { id: orderId, name, email, phone, address, subtotal, shipping, discount: discount || 0, total };
            mailer.sendMail({ from: STORE_EMAIL, to: email, subject: `Order Confirmed — #${orderId} | Rift Thrift`, html: buildOrderEmail(fullOrder, items) }).catch(() => {});
            if (ADMIN_EMAIL) mailer.sendMail({ from: STORE_EMAIL, to: ADMIN_EMAIL, subject: `New Order #${orderId} — Rs. ${total}`, html: `<h2>New Order #${orderId}</h2><p><b>${name}</b> | ${phone} | Rs. ${total}</p><p>${address}</p>` }).catch(() => {});
        }
        res.status(201).json({ orderId, message: 'Order placed successfully.' });
    } catch(e) { console.error(e); res.status(500).json({ error: 'Failed to save order.' }); }
});

app.get('/api/my-orders', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM orders WHERE email = $1 ORDER BY created_at DESC`, [req.user.email]);
        res.json(rows);
    } catch { res.status(500).json({ error: 'Failed to fetch orders.' }); }
});

app.put('/api/my-orders/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
        if (rows[0].email !== req.user.email) return res.status(403).json({ error: 'Not authorized.' });
        if (rows[0].status !== 'Pending') return res.status(400).json({ error: 'Only pending orders can be cancelled.' });
        await pool.query(`UPDATE orders SET status = 'Cancelled' WHERE id = $1`, [req.params.id]);
        res.json({ message: 'Order cancelled.' });
    } catch { res.status(500).json({ error: 'Failed to cancel order.' }); }
});

// ─── Admin: Orders ────────────────────────────────────────────────────────────────
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM orders ORDER BY created_at DESC`);
        res.json(rows);
    } catch { res.status(500).json({ error: 'Failed to fetch orders.' }); }
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { rows: r1 } = await pool.query(`SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as total FROM orders WHERE status != 'Cancelled'`);
        const { rows: r2 } = await pool.query(`SELECT COUNT(*) as pending FROM orders WHERE status = 'Pending'`);
        const { rows: r3 } = await pool.query(`SELECT COUNT(*) as customers FROM users WHERE role = 'user'`);
        res.json({ revenue: parseInt(r1[0].revenue), totalOrders: parseInt(r1[0].total), pendingOrders: parseInt(r2[0].pending), customers: parseInt(r3[0].customers) });
    } catch { res.status(500).json({ error: 'Failed to get stats.' }); }
});

app.put('/api/admin/orders/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { status } = req.body;
    if (!['Pending','Shipped','Delivered','Cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    try {
        const { rows } = await pool.query(`UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`, [status, req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
        const order = rows[0];
        if (mailer && order.email && ['Shipped','Delivered','Cancelled'].includes(status)) {
            mailer.sendMail({ from: STORE_EMAIL, to: order.email, subject: `Order #${order.id} ${status} — Rift Thrift`, html: buildStatusEmail(order, status) }).catch(() => {});
        }
        res.json({ message: 'Status updated.' });
    } catch { res.status(500).json({ error: 'Failed to update order.' }); }
});

// ─── Admin: Products ──────────────────────────────────────────────────────────────
app.get('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM products ORDER BY sort_order ASC, id ASC`);
        res.json(rows.map(p => ({ ...p, images: JSON.parse(p.images || '[]'), sizes: JSON.parse(p.sizes || '["S","M","L","XL"]'), unavailable_sizes: JSON.parse(p.unavailable_sizes || '[]') })));
    } catch { res.status(500).json({ error: 'Failed to fetch products.' }); }
});

app.post('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
    const { name, gender, category, price, sale_price, sale_type, color, color_hex, description, images, sizes, is_best_seller, is_new, is_flash_sale } = req.body;
    if (!name || !gender || !category || !price) return res.status(400).json({ error: 'Name, gender, category, price required.' });
    try {
        const { rows } = await pool.query(
            `INSERT INTO products (name,gender,category,price,sale_price,sale_type,color,color_hex,description,images,sizes,is_best_seller,is_new,is_flash_sale) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
            [name, gender, category, parseFloat(price), sale_price ? parseFloat(sale_price) : null, sale_type || '', color || '', color_hex || '#000000', description || '', JSON.stringify(images || []), JSON.stringify(sizes || ['S','M','L','XL']), is_best_seller || false, is_new || false, is_flash_sale || false]
        );
        res.status(201).json({ id: rows[0].id, message: 'Product created.' });
    } catch(e) { res.status(500).json({ error: 'Failed to create product.' }); }
});

app.put('/api/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { name, gender, category, price, sale_price, sale_type, color, color_hex, description, images, sizes, is_best_seller, is_new, is_flash_sale, is_active, unavailable_sizes, sort_order } = req.body;
    try {
        await pool.query(
            `UPDATE products SET name=$1,gender=$2,category=$3,price=$4,sale_price=$5,sale_type=$6,color=$7,color_hex=$8,description=$9,images=$10,sizes=$11,is_best_seller=$12,is_new=$13,is_flash_sale=$14,is_active=$15,unavailable_sizes=$16,sort_order=$17 WHERE id=$18`,
            [name, gender, category, parseFloat(price), sale_price ? parseFloat(sale_price) : null, sale_type || '', color || '', color_hex || '#000000', description || '', JSON.stringify(images || []), JSON.stringify(sizes || ['S','M','L','XL']), is_best_seller || false, is_new || false, is_flash_sale || false, is_active !== false, JSON.stringify(unavailable_sizes || []), sort_order || 0, req.params.id]
        );
        res.json({ message: 'Product updated.' });
    } catch(e) { console.error(e); res.status(500).json({ error: 'Failed to update product.' }); }
});

app.put('/api/admin/products/:id/toggle', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query(`UPDATE products SET is_active = NOT is_active WHERE id = $1`, [req.params.id]);
        res.json({ message: 'Product visibility toggled.' });
    } catch { res.status(500).json({ error: 'Failed to toggle product.' }); }
});

app.delete('/api/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query(`DELETE FROM products WHERE id = $1`, [req.params.id]);
        res.json({ message: 'Product deleted.' });
    } catch { res.status(500).json({ error: 'Failed to delete product.' }); }
});

// ─── Admin: Coupons ───────────────────────────────────────────────────────────────
app.get('/api/admin/coupons', authenticateToken, requireAdmin, async (req, res) => {
    try { const { rows } = await pool.query(`SELECT * FROM coupons ORDER BY id DESC`); res.json(rows); }
    catch { res.status(500).json({ error: 'Failed.' }); }
});

app.post('/api/admin/coupons', authenticateToken, requireAdmin, async (req, res) => {
    const { code, discount_type, discount_value, min_order } = req.body;
    if (!code || !discount_type || !discount_value) return res.status(400).json({ error: 'Missing required fields.' });
    try {
        await pool.query(`INSERT INTO coupons (code, discount_type, discount_value, min_order) VALUES (UPPER($1),$2,$3,$4)`,
            [code, discount_type, parseFloat(discount_value), parseFloat(min_order) || 0]);
        res.status(201).json({ message: 'Coupon created.' });
    } catch { res.status(400).json({ error: 'Code already exists.' }); }
});

app.put('/api/admin/coupons/:id/toggle', authenticateToken, requireAdmin, async (req, res) => {
    try { await pool.query(`UPDATE coupons SET is_active = NOT is_active WHERE id = $1`, [req.params.id]); res.json({ message: 'Toggled.' }); }
    catch { res.status(500).json({ error: 'Failed.' }); }
});

app.delete('/api/admin/coupons/:id', authenticateToken, requireAdmin, async (req, res) => {
    try { await pool.query(`DELETE FROM coupons WHERE id = $1`, [req.params.id]); res.json({ message: 'Deleted.' }); }
    catch { res.status(500).json({ error: 'Failed.' }); }
});

// ─── Admin: Customers ─────────────────────────────────────────────────────────────
app.get('/api/admin/customers', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT id, name, username, email, phone, role, created_at FROM users WHERE role = 'user' ORDER BY created_at DESC`);
        res.json(rows);
    } catch { res.status(500).json({ error: 'Failed.' }); }
});

// ─── Wildcard → SPA ────────────────────────────────────────────────────────────────
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// ─── Export for Vercel serverless ─────────────────────────────────────────────
module.exports = app;

// ─── Start server when running directly (not on Vercel) ───────────────────────
if (require.main === module) {
    initDB()
        .then(() => app.listen(PORT, '0.0.0.0', () => {
            console.log(`Admin ready: ${process.env.ADMIN_EMAIL || 'moiz3996317@gmail.com'}`);
            console.log('Rift Thrift DB ready.');
            console.log(`Rift Thrift active on port ${PORT}`);
        }))
        .catch(err => { console.error('Startup failed:', err.message); process.exit(1); });
} else {
    // Vercel: initialise DB on cold start — requests wait until ready
    _dbReady = initDB().catch(err => console.error('DB init error:', err.message));
}
