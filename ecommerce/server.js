const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = "rift_thrift_curated_raw_secret_token_key_2026";

app.use(cors());
app.use(express.json());

// Serve Static Frontend files directly
app.use(express.static(path.join(__dirname)));

const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error("Database connection failure:", err.message);
    } else {
        console.log("Connected to SQLite engine.");
        initTables();
    }
});

function initTables() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        phone TEXT,
        password TEXT,
        role TEXT DEFAULT 'user'
    )`, (err) => {
        if (!err) seedAdmin();
    });

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        subtotal REAL,
        shipping REAL,
        total REAL,
        status TEXT DEFAULT 'Pending',
        items TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

function seedAdmin() {
    const adminEmail = 'admin@riftthrift.pk';
    db.get("SELECT * FROM users WHERE email = ?", [adminEmail], (err, row) => {
        if (!row) {
            const hashedPassword = bcrypt.hashSync('adminpassword', 10);
            db.run(`INSERT INTO users (name, username, email, phone, password, role) 
                    VALUES (?, ?, ?, ?, ?, 'admin')`, 
                    ['System Administrator', 'admin', adminEmail, '+923001234567', hashedPassword]);
            console.log("Seeded default admin. Email: admin@riftthrift.pk | Pass: adminpassword");
        }
    });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Unauthorized access token" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid/Expired Token Session" });
        req.user = user;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: "Access Denied." });
    }
}

// User Registration API
app.post('/api/auth/signup', (req, res) => {
    const { name, username, email, phone, password } = req.body;
    if (!name || !username || !email || !phone || !password) {
        return res.status(400).json({ error: "Fill all properties" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const sql = `INSERT INTO users (name, username, email, phone, password) VALUES (?, ?, ?, ?, ?)`;

    db.run(sql, [name, username, email, phone, hashedPassword], function(err) {
        if (err) {
            return res.status(400).json({ error: "Email or Username already exists." });
        }
        res.status(201).json({ message: "Account created successfully!" });
    });
});

// User Login API
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Credentials required" });
    }

    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: "Invalid Email or Password" });
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: "Invalid Email or Password" });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
        });
    });
});

// Checkout / Place Order API
app.post('/api/orders', (req, res) => {
    const { name, email, phone, address, subtotal, shipping, total, items } = req.body;

    if (!name || !email || !phone || !address || !items || items.length === 0) {
        return res.status(400).json({ error: "Incomplete details inside order request form." });
    }

    const itemsJsonString = JSON.stringify(items);
    const sql = `INSERT INTO orders (name, email, phone, address, subtotal, shipping, total, items) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [name, email, phone, address, subtotal, shipping, total, itemsJsonString], function(err) {
        if (err) {
            return res.status(500).json({ error: "Database failure registering order ledger." });
        }
        res.status(201).json({ message: "Order registered successfully!", orderId: this.lastID });
    });
});

// Admin Route: Get all orders
app.get('/api/admin/orders', authenticateToken, requireAdmin, (req, res) => {
    db.all("SELECT * FROM orders ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database retrieval error." });
        res.json(rows);
    });
});

// Admin Route: Update status
app.put('/api/admin/orders/:id', authenticateToken, requireAdmin, (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;

    if (!['Pending', 'Shipped', 'Delivered'].includes(status)) {
        return res.status(400).json({ error: "Invalid status state update requested" });
    }

    db.run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId], function(err) {
        if (err) return res.status(500).json({ error: "Database failed to update order record." });
        res.json({ message: "Order status modified!" });
    });
});

// Admin Route: Dashboard analytics stats
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
    const queryStats = `
        SELECT 
            COUNT(*) as totalOrders,
            SUM(CASE WHEN status != 'Cancelled' THEN total ELSE 0 END) as revenue,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingOrders
        FROM orders
    `;
    db.get(queryStats, [], (err, row) => {
        if (err) return res.status(500).json({ error: "Failed to compile analytical data." });
        res.json({
            totalOrders: row.totalOrders || 0,
            revenue: row.revenue || 0,
            pendingOrders: row.pendingOrders || 0
        });
    });
});

// Wildcard router: Serves your index.html homepage automatically
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Rift Thrift control engine active on port ${PORT}`);
});