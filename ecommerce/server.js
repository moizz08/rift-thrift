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
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── PostgreSQL Pool ───────────────────────────────────────────────────────────
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

// ─── Email Transporter (Gmail SMTP) ───────────────────────────────────────────
const mailer = (process.env.EMAIL_USER && process.env.EMAIL_PASS)
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    })
    : null;

const STORE_EMAIL = process.env.EMAIL_USER || 'noreply@riftthrift.pk';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

// ─── Database Init ─────────────────────────────────────────────────────────────
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            phone TEXT,
            password TEXT,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            name TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            subtotal NUMERIC,
            shipping NUMERIC,
            discount NUMERIC DEFAULT 0,
            total NUMERIC,
            coupon_code TEXT,
            status TEXT DEFAULT 'Pending',
            items TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS coupons (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE,
            discount_type TEXT DEFAULT 'percent',
            discount_value NUMERIC,
            min_order NUMERIC DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            usage_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    await seedAdmin();
    await seedDefaultCoupons();
    console.log('Rift Thrift DB ready.');
}

async function seedAdmin() {
    const adminEmail = 'moiz3996317@gmail.com';
    const hashed = bcrypt.hashSync('moizmoiz08', 10);
    await pool.query(`DELETE FROM users WHERE role = 'admin'`);
    await pool.query(
        `INSERT INTO users (name, username, email, phone, password, role)
         VALUES ($1, $2, $3, $4, $5, 'admin')
         ON CONFLICT (email) DO NOTHING`,
        ['Moiz Admin', 'moizadmin', adminEmail, '+923001234567', hashed]
    );
    console.log('Admin ready: moiz3996317@gmail.com');
}

async function seedDefaultCoupons() {
    const coupons = [
        { code: 'WELCOME10', type: 'percent', value: 10, min: 0 },
        { code: 'RIFT20',    type: 'percent', value: 20, min: 1000 },
        { code: 'FLAT200',   type: 'fixed',   value: 200, min: 500 },
    ];
    for (const c of coupons) {
        await pool.query(
            `INSERT INTO coupons (code, discount_type, discount_value, min_order)
             VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING`,
            [c.code, c.type, c.value, c.min]
        );
    }
}

// ─── Email Templates ───────────────────────────────────────────────────────────
function buildOrderConfirmedEmail(order, items) {
    const rows = items.map(it => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#222;">
            <strong>${it.product_name}</strong>
            <div style="color:#888;font-size:11px;margin-top:2px;">Size: ${it.size} &nbsp;|&nbsp; Color: ${it.color} &nbsp;|&nbsp; Qty: ${it.quantity}</div>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;font-size:13px;">
            Rs. ${(it.price * it.quantity).toLocaleString()}
          </td>
        </tr>`).join('');

    const discountRow = order.discount > 0 ? `
        <tr>
          <td style="padding:6px 0;color:#16a34a;font-weight:700;font-size:13px;">DISCOUNT (${order.coupon_code})</td>
          <td style="padding:6px 0;text-align:right;color:#16a34a;font-weight:700;font-size:13px;">- Rs. ${Number(order.discount).toLocaleString()}</td>
        </tr>` : '';

    return `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <div style="background:#000;padding:36px 30px;text-align:center;">
    <h1 style="color:#fff;font-size:22px;letter-spacing:8px;margin:0;font-weight:800;">RIFT THRIFT</h1>
    <p style="color:rgba(255,255,255,0.35);font-size:10px;letter-spacing:4px;margin:8px 0 0;">CURATED THREADS. REAL PRICES.</p>
  </div>
  <div style="padding:36px 30px;">
    <h2 style="font-size:16px;letter-spacing:3px;margin:0 0 6px;text-transform:uppercase;color:#111;">Order Confirmed! 🎉</h2>
    <p style="color:#555;font-size:13px;margin:0 0 28px;line-height:1.6;">Hi <strong>${order.name}</strong>, your order <strong>#${order.id}</strong> has been received. We'll contact you shortly to confirm delivery.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${rows}
      <tr><td style="padding:10px 0;color:#888;font-size:13px;">Subtotal</td><td style="padding:10px 0;text-align:right;color:#888;font-size:13px;">Rs. ${Number(order.subtotal).toLocaleString()}</td></tr>
      <tr><td style="padding:4px 0;color:#888;font-size:13px;">Shipping</td><td style="padding:4px 0;text-align:right;color:#888;font-size:13px;">Rs. ${Number(order.shipping).toLocaleString()}</td></tr>
      ${discountRow}
      <tr>
        <td style="padding:14px 0 0;font-weight:800;font-size:16px;letter-spacing:1px;border-top:2px solid #000;">TOTAL</td>
        <td style="padding:14px 0 0;text-align:right;font-weight:800;font-size:16px;letter-spacing:1px;border-top:2px solid #000;">Rs. ${Number(order.total).toLocaleString()}</td>
      </tr>
    </table>
    <div style="margin-top:28px;padding:18px;background:#f9f9f9;border-radius:4px;">
      <p style="font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;font-weight:700;">Delivery Address</p>
      <p style="font-size:13px;color:#333;margin:0;line-height:1.6;">${order.address}</p>
      <p style="font-size:12px;color:#555;margin:8px 0 0;">📞 ${order.phone}</p>
    </div>
    <p style="margin-top:24px;font-size:12px;color:#888;line-height:1.7;">Payment: <strong>Cash on Delivery</strong> &nbsp;|&nbsp; Expected delivery: 3-5 business days</p>
  </div>
  <div style="background:#f9f9f9;padding:20px 30px;text-align:center;border-top:1px solid #eee;">
    <p style="font-size:10px;color:#aaa;letter-spacing:2px;margin:0;">© RIFT THRIFT 2026 — KARACHI, PAKISTAN</p>
    <p style="font-size:10px;color:#ccc;margin:6px 0 0;">Questions? WhatsApp us at +92 300 1234567</p>
  </div>
</div></body></html>`;
}

function buildStatusUpdateEmail(order, newStatus) {
    const info = {
        Shipped:   { emoji: '🚚', headline: "Your Order is On Its Way!", msg: "Great news! Your order has been dispatched and is heading your way. Expected delivery in 2-3 business days." },
        Delivered: { emoji: '✅', headline: "Order Delivered!", msg: "Your order has been delivered. We hope you love your new threads! Feel free to reach out if you need anything." }
    }[newStatus] || { emoji: '📦', headline: "Order Update", msg: `Your order status is now: ${newStatus}.` };

    return `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <div style="background:#000;padding:36px 30px;text-align:center;">
    <h1 style="color:#fff;font-size:22px;letter-spacing:8px;margin:0;font-weight:800;">RIFT THRIFT</h1>
  </div>
  <div style="padding:40px 30px;text-align:center;">
    <div style="font-size:60px;margin-bottom:16px;">${info.emoji}</div>
    <h2 style="font-size:18px;letter-spacing:2px;margin:0 0 12px;text-transform:uppercase;">${info.headline}</h2>
    <p style="color:#555;font-size:13px;margin:0 0 28px;line-height:1.7;max-width:440px;display:inline-block;">${info.msg}</p>
    <div style="background:#f9f9f9;padding:16px 24px;border-radius:4px;display:inline-block;text-align:left;">
      <p style="font-size:13px;color:#333;margin:0;">Order <strong>#${order.id}</strong> &nbsp;—&nbsp; Rs. ${Number(order.total).toLocaleString()}</p>
      <p style="font-size:11px;color:#aaa;margin:4px 0 0;">${order.address}</p>
    </div>
    <p style="margin-top:28px;font-size:12px;color:#888;">Thank you for shopping with <strong>Rift Thrift</strong> 🙏</p>
  </div>
  <div style="background:#f9f9f9;padding:16px 30px;text-align:center;border-top:1px solid #eee;">
    <p style="font-size:10px;color:#aaa;letter-spacing:2px;margin:0;">© RIFT THRIFT 2026 — KARACHI, PAKISTAN</p>
  </div>
</div></body></html>`;
}

async function sendEmail(to, subject, html) {
    if (!mailer || !to) return;
    try {
        await mailer.sendMail({ from: `"Rift Thrift" <${STORE_EMAIL}>`, to, subject, html });
    } catch (e) {
        console.error('Email error:', e.message);
    }
}

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid/Expired Token" });
        req.user = user;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (req.user?.role === 'admin') return next();
    res.status(403).json({ error: "Access Denied." });
}

// ─── Auth Routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
    const { name, username, email, phone, password } = req.body;
    if (!name || !username || !email || !phone || !password)
        return res.status(400).json({ error: "Fill all fields." });
    try {
        const hashed = bcrypt.hashSync(password, 10);
        await pool.query(
            `INSERT INTO users (name, username, email, phone, password) VALUES ($1,$2,$3,$4,$5)`,
            [name, username, email, phone, hashed]
        );
        res.status(201).json({ message: "Account created successfully!" });
    } catch {
        res.status(400).json({ error: "Email or username already exists." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Credentials required." });
    try {
        const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        const user = rows[0];
        if (!user || !bcrypt.compareSync(password, user.password))
            return res.status(400).json({ error: "Invalid Email or Password." });
        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            JWT_SECRET, { expiresIn: '24h' }
        );
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, username: user.username, role: user.role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during login." });
    }
});

// ─── Order Routes ──────────────────────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
    const { name, email, phone, address, subtotal, shipping, discount = 0, total, coupon_code, items } = req.body;
    if (!name || !email || !phone || !address || !items?.length)
        return res.status(400).json({ error: "Incomplete order details." });
    try {
        const { rows } = await pool.query(
            `INSERT INTO orders (name, email, phone, address, subtotal, shipping, discount, total, coupon_code, items)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
            [name, email, phone, address, subtotal, shipping, discount, total, coupon_code || null, JSON.stringify(items)]
        );
        const orderId = rows[0].id;
        if (coupon_code) {
            await pool.query(`UPDATE coupons SET usage_count = usage_count + 1 WHERE code = $1`, [coupon_code]);
        }
        const orderData = { id: orderId, name, email, address, phone, subtotal, shipping, discount, total, coupon_code };
        sendEmail(email, `Order #${orderId} Confirmed — Rift Thrift`, buildOrderConfirmedEmail(orderData, items));
        if (ADMIN_EMAIL && ADMIN_EMAIL !== email) {
            sendEmail(ADMIN_EMAIL, `New Order #${orderId} — Rs. ${total}`, `<p>New order from <strong>${name}</strong> (${email}). Total: <strong>Rs. ${total}</strong>. Log in to the admin panel to manage it.</p>`);
        }
        res.status(201).json({ message: "Order placed successfully!", orderId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to register order." });
    }
});

app.get('/api/my-orders', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM orders WHERE email = $1 ORDER BY id DESC`, [req.user.email]);
        res.json(rows);
    } catch {
        res.status(500).json({ error: "Failed to fetch orders." });
    }
});

app.put('/api/my-orders/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM orders WHERE id = $1 AND email = $2`, [req.params.id, req.user.email]);
        if (!rows[0]) return res.status(404).json({ error: "Order not found." });
        if (rows[0].status !== 'Pending') return res.status(400).json({ error: "Only pending orders can be cancelled." });
        await pool.query(`UPDATE orders SET status = 'Cancelled' WHERE id = $1`, [req.params.id]);
        res.json({ message: "Order cancelled." });
    } catch {
        res.status(500).json({ error: "Failed to cancel order." });
    }
});

// ─── Coupon Routes ─────────────────────────────────────────────────────────────
app.post('/api/coupons/apply', async (req, res) => {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ error: "No coupon code provided." });
    try {
        const { rows } = await pool.query(
            `SELECT * FROM coupons WHERE code = UPPER($1) AND is_active = true`, [code]
        );
        if (!rows[0]) return res.status(404).json({ error: "Invalid or expired coupon code." });
        const coupon = rows[0];
        if (Number(subtotal) < Number(coupon.min_order))
            return res.status(400).json({ error: `Minimum order of Rs. ${coupon.min_order} required for this code.` });
        let discountAmt = coupon.discount_type === 'percent'
            ? Math.round((Number(subtotal) * Number(coupon.discount_value)) / 100)
            : Math.min(Number(coupon.discount_value), Number(subtotal));
        res.json({ valid: true, code: coupon.code, discount_type: coupon.discount_type, discount_value: Number(coupon.discount_value), discount_amount: discountAmt });
    } catch {
        res.status(500).json({ error: "Coupon validation failed." });
    }
});

// ─── Admin Routes ──────────────────────────────────────────────────────────────
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM orders ORDER BY id DESC`);
        res.json(rows);
    } catch {
        res.status(500).json({ error: "Database retrieval error." });
    }
});

app.put('/api/admin/orders/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { status } = req.body;
    if (!['Pending', 'Shipped', 'Delivered'].includes(status))
        return res.status(400).json({ error: "Invalid status." });
    try {
        await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [status, req.params.id]);
        if (['Shipped', 'Delivered'].includes(status)) {
            const { rows } = await pool.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id]);
            if (rows[0]) {
                const subj = status === 'Shipped' ? `Your Order #${rows[0].id} Has Been Shipped! 🚚` : `Your Order #${rows[0].id} Has Been Delivered! ✅`;
                sendEmail(rows[0].email, subj, buildStatusUpdateEmail(rows[0], status));
            }
        }
        res.json({ message: "Order status updated!" });
    } catch {
        res.status(500).json({ error: "Failed to update order." });
    }
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                COUNT(*)::int AS "totalOrders",
                COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN total ELSE 0 END), 0) AS revenue,
                COUNT(CASE WHEN status = 'Pending' THEN 1 END)::int AS "pendingOrders"
            FROM orders
        `);
        res.json({ totalOrders: rows[0].totalOrders, revenue: parseFloat(rows[0].revenue), pendingOrders: rows[0].pendingOrders });
    } catch {
        res.status(500).json({ error: "Failed to get stats." });
    }
});

app.get('/api/admin/coupons', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM coupons ORDER BY id DESC`);
        res.json(rows);
    } catch {
        res.status(500).json({ error: "Failed to get coupons." });
    }
});

app.post('/api/admin/coupons', authenticateToken, requireAdmin, async (req, res) => {
    const { code, discount_type, discount_value, min_order } = req.body;
    if (!code || !discount_type || !discount_value)
        return res.status(400).json({ error: "Missing required fields." });
    try {
        await pool.query(
            `INSERT INTO coupons (code, discount_type, discount_value, min_order) VALUES (UPPER($1),$2,$3,$4)`,
            [code, discount_type, parseFloat(discount_value), parseFloat(min_order) || 0]
        );
        res.status(201).json({ message: "Coupon created successfully." });
    } catch {
        res.status(400).json({ error: "Coupon code already exists." });
    }
});

app.put('/api/admin/coupons/:id/toggle', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query(`UPDATE coupons SET is_active = NOT is_active WHERE id = $1`, [req.params.id]);
        res.json({ message: "Coupon toggled." });
    } catch {
        res.status(500).json({ error: "Failed to toggle coupon." });
    }
});

app.delete('/api/admin/coupons/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query(`DELETE FROM coupons WHERE id = $1`, [req.params.id]);
        res.json({ message: "Coupon deleted." });
    } catch {
        res.status(500).json({ error: "Failed to delete coupon." });
    }
});

// ─── Wildcard ──────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Boot ──────────────────────────────────────────────────────────────────────
initDB()
    .then(() => app.listen(PORT, () => console.log(`Rift Thrift engine active on port ${PORT}`)))
    .catch(err => { console.error('Startup failed:', err.message); process.exit(1); });
