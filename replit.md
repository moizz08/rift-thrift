# Rift Thrift

A full-stack e-commerce clothing store for Rift Thrift, a Pakistan-based fashion brand selling jeans, shorts, and more.

## Stack

- **Backend**: Node.js + Express.js (`ecommerce/server.js`)
- **Frontend**: Vanilla JS + HTML/CSS (`ecommerce/index.html`, `ecommerce/app.js`, `ecommerce/style.css`)
- **Database**: PostgreSQL (Replit managed, via `DATABASE_URL`)
- **Auth**: JWT tokens (stored in localStorage)

## Running the app

The **Rift Thrift** workflow starts the server:

```
cd /home/runner/workspace/ecommerce && PORT=8080 node server.js
```

On startup, the server automatically:
- Creates all required tables (`users`, `orders`, `products`, `coupons`)
- Seeds a default admin account
- Seeds default coupon codes (WELCOME10, RIFT20, FLAT200)
- Seeds 16 initial products if the products table is empty

## Environment variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | **Yes** — auto-provided by Replit |
| `JWT_SECRET` | JWT signing secret | No — falls back to a hardcoded default |
| `EMAIL_USER` | Gmail address for order emails | No |
| `EMAIL_PASS` | Gmail app password for emails | No |
| `ADMIN_EMAIL` | Admin notification email | No — defaults to `EMAIL_USER` |

## Admin access

Default admin credentials seeded on startup:
- **Email**: `moiz3996317@gmail.com`
- **Password**: `moizmoiz08`

## User preferences

- Keep the existing project structure (Express + vanilla JS, single directory)
