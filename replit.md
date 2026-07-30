# Rift Thrift

A clothing ecommerce store (Karachi, Pakistan) with a vanilla HTML/CSS/JS storefront and an Express + PostgreSQL backend.

## Run & Operate

- **Workflow:** `Rift Thrift` — starts the server on port 8080 (`PORT=8080 node ecommerce/server.js`)
- The app auto-initializes all DB tables and seeds sample products + admin on first run
- `sqlite3` has been removed from `ecommerce/package.json` (unused + CVE block); the server uses PostgreSQL via `pg`
- Required env: `DATABASE_URL` — Replit's built-in PostgreSQL (auto-provisioned, no setup needed)

## Stack

- Node.js, Express 4, PostgreSQL (`pg`)
- Auth: JWT (`jsonwebtoken`) + bcrypt
- Email: Nodemailer (Gmail) — optional; works without it
- Frontend: vanilla HTML/CSS/JS in `ecommerce/`

## Where things live

- `ecommerce/server.js` — Express server, DB init, all API routes
- `ecommerce/index.html` — storefront UI entry point
- `ecommerce/app.js` — frontend JS (products, cart, checkout, wishlist, admin)
- `ecommerce/style.css` — all styles

## Architecture decisions

- DB schema is created via `CREATE TABLE IF NOT EXISTS` on every startup — no migration files needed
- Products, admin user, and default coupons are seeded automatically on first run
- `sqlite3` removed (unused; blocked by CVE policy) — only PostgreSQL is used
- Email notifications are optional: if `EMAIL_USER`/`EMAIL_PASS` are not set, the server runs without email

## Product

Rift Thrift is a clothing store for Men, Women, and Kids. Features: product browsing with filters, cart, wishlist, coupon codes, Cash on Delivery checkout, user accounts, order tracking, and a full admin panel (products, orders, coupons, stats).

## Admin credentials (seeded)

- Email: `moiz3996317@gmail.com`
- Password: `moizmoiz08`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The `Rift Thrift` workflow runs the server on port 8080 (preview pane). Do not use the old `Start application` workflow.
- `sqlite3` must NOT be re-added to `ecommerce/package.json` — it is blocked by Replit's security policy (Critical CVE) and is not used by the server.
- Email (Nodemailer) only activates when both `EMAIL_USER` and `EMAIL_PASS` secrets are set. Add them via Replit Secrets if order confirmation emails are needed.
