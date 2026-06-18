# Maxims Interiors & Home Goods

> _Where Luxury Meets Living_ — production website for a premium Abuja interior‑design, home‑goods, and trade‑supply brand.

A full‑stack luxury site: public storefront + portfolio, a role‑based staff admin dashboard, payments (Squad / Paystack) with server‑side verification, and automated transactional + newsletter email.

---

## Architecture

```
maxims-production/
├─ src/            # Frontend — Vite + React 18 + Tailwind v3 + Framer Motion
├─ server/         # Backend  — Node + Express + MongoDB (Mongoose)
└─ supabase/       # DEPRECATED (earlier Supabase build — kept for reference, not used)
```

| Layer | Choice |
|------|--------|
| Frontend | Vite + React 18, React Router v6, Tailwind v3, Framer Motion |
| Backend | Node + Express + MongoDB (Mongoose) |
| Auth | JWT (bcrypt-hashed passwords) + role-based access |
| Storage | Backend-provided uploads (Multer → local disk, or Cloudinary) |
| Payments | **Squad (GTCO)** + **Paystack** — one provider abstraction, server-verified |
| Email | **Whogohost SMTP** + **Resend** — one mailer abstraction (Nodemailer) |
| Hosting | Frontend → Vercel · API → Render/Railway/VPS · DB → MongoDB Atlas |

The frontend talks only to the Express API (`src/lib/api.js`). Image fields store full URLs. Activity is logged server-side on every write.

---

## 1. Run the API (server)

```bash
cd server
npm install
cp .env.example .env          # set MONGODB_URI, JWT_SECRET, OWNER_*, payment/email keys
npm run seed                  # creates the owner account + sample data
npm run dev                   # http://localhost:4000  (GET /health to check)
```

Needs MongoDB — local (`mongodb://127.0.0.1:27017/maxims`) or a free **MongoDB Atlas** cluster.

## 2. Run the frontend

```bash
# from the project root
npm install
cp .env.example .env          # set VITE_API_URL=http://localhost:4000
npm run dev                   # http://localhost:5173
```

Sign in at `/admin/login` with the `OWNER_EMAIL` / `OWNER_PASSWORD` from `server/.env`.

---

## 3. Environment variables

**Frontend (`.env`)** — browser-exposed, public only: `VITE_API_URL`, `VITE_PAYMENT_PROVIDER`, `VITE_SQUAD_PUBLIC_KEY`, `VITE_PAYSTACK_PUBLIC_KEY`.

**Server (`server/.env`)** — all secrets live here. See `server/.env.example`:
core (`PORT`, `CLIENT_ORIGIN`, `API_URL`, `APP_URL`), `MONGODB_URI`, `JWT_SECRET`, owner seed, storage (`STORAGE_DRIVER=local|cloudinary` + `CLOUDINARY_*`), payments (`SQUAD_SECRET_KEY`, `SQUAD_WEBHOOK_SECRET`, `PAYSTACK_SECRET_KEY`), email (`EMAIL_PROVIDER=smtp|resend` + `SMTP_*` / `RESEND_API_KEY`, `MAIL_FROM`, `NOTIFICATION_EMAIL`).

---

## 4. How payments work

1. Storefront/admin → `POST /api/payments/initialize` → a **pending** transaction is created and a gateway **checkout URL** returned.
2. Customer pays, then is redirected to `/payment/callback?reference=…`.
3. The callback calls `POST /api/payments/verify`, which confirms with the gateway **server-side** and flips the status. The signed **webhook** (`/api/payments/webhook?provider=squad|paystack`) is the authoritative settlement path.
4. The browser can never mark a payment paid — only the server can, and the amount is re-checked against the gateway.

**Admin payment links:** Transactions → *Payment Link* generates a shareable Squad/Paystack link for any amount (deposits, custom quotes) and tracks it.

Configure each gateway's webhook URL to `https://<your-api-host>/api/payments/webhook?provider=squad` (and `…=paystack`).

---

## 5. Email

Transactional email is sent inline by the API (contact auto-reply + staff alert, order receipt, appointment confirmation on confirm, bulk quote on quote, newsletter welcome). Set `EMAIL_PROVIDER=smtp` with your Whogohost mailbox, or `resend` with a Resend key.

---

## 6. Deploy

### API → Render (or Railway / any Node host)
1. New **Web Service** from your GitHub repo, root directory `server`.
2. Build `npm install`, start `npm start`.
3. Add all `server/.env` values as environment variables (set `API_URL` to the Render URL, `APP_URL` to your Vercel URL, `CLIENT_ORIGIN` to your frontend origin).
4. Use **MongoDB Atlas** for `MONGODB_URI`. Run the seed once (Render Shell: `npm run seed`).
> Note: with `STORAGE_DRIVER=local`, uploads sit on the service disk (ephemeral on some hosts). For permanent media set `STORAGE_DRIVER=cloudinary`.

### Frontend → Vercel
1. **Import Project** → framework **Vite**, build `npm run build`, output `dist` (`vercel.json` included).
2. Env var `VITE_API_URL=https://<your-api-host>` (+ payment public keys).
3. Add your custom domain; point the API's `CLIENT_ORIGIN`/`APP_URL` at it.

### Push to GitHub
```bash
git init
git add .
git commit -m "Maxims Interiors — production build (MERN)"
git branch -M main
git remote add origin https://github.com/<you>/maxims-interiors.git
git push -u origin main
```

---

## 7. Admin roles
`owner` (full) · `senior_designer` · `project_manager` · `shop_manager` · `content_editor`. Enforced both in the UI (`useAuth().can()/canWrite()`) and on the server (`requireAuth` + `canAccess`/`canWrite` middleware).

## Security
JWT auth, bcrypt password hashing, role middleware on every admin route, rate limiting on auth + public form/payment endpoints, HMAC-verified gateway webhooks, server-side payment verification with amount checks, Helmet, CORS allow-list, no secrets in the client bundle.

---

_Built by [TrueWeb Network](https://trueweb.com.ng)._
