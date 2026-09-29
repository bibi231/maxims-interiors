# Maxims Interiors & Home Goods

> _Where Luxury Meets Living_ — production website for a premium Abuja interior‑design, home‑goods, and trade‑supply brand.

A full‑stack luxury site: public storefront + portfolio, a role‑based staff admin dashboard, payments (Squad / Paystack) with server‑side verification, and automated transactional + newsletter email.

---

## Architecture

```
maxims-production/
├─ src/            # Frontend — Vite + React 18 + Tailwind v3 + Framer Motion
├─ server/         # Backend  — Node + Express + MariaDB (mysql2)
└─ supabase/       # DEPRECATED (earlier Supabase build — kept for reference, not used)
```

| Layer | Choice |
|------|--------|
| Frontend | Vite + React 18, React Router v6, Tailwind v3, Framer Motion |
| Backend | Node + Express + MariaDB/MySQL (mysql2, `server/src/db/model.js`) |
| Auth | JWT (bcrypt-hashed passwords) + role-based access |
| Storage | Backend-provided uploads (Multer → local disk, or Cloudinary) |
| Payments | **Squad (GTCO)** + **Paystack** — one provider abstraction, server-verified |
| Email | **Whogohost SMTP** + **Resend** — one mailer abstraction (Nodemailer) |
| Hosting | DirectAdmin: frontend in public_html · API as a Node app · DB → MariaDB on the same server |

The frontend talks only to the Express API (`src/lib/api.js`). Image fields store full URLs. Activity is logged server-side on every write.

---

## 1. Run the API (server)

```bash
cd server
npm install
cp .env.example .env          # set DATABASE_URL, JWT_SECRET, payment/email keys
npm run db:schema             # creates the tables (sql/001-schema.sql, idempotent)
npm run seed                  # site settings + base catalogue
npm run seed:photos           # real catalogue photos/products (Cloudinary URLs)
npm run staff                 # staff accounts, each emailed a 72h set-up link
npm run dev                   # http://localhost:4000  (GET /api/health checks the DB)
```

Needs MariaDB 10.3+ or MySQL 8: `DATABASE_URL=mysql://user:pass@host:3306/dbname`.

### Moving the live data from MongoDB (one-off)

The production data still lives in MongoDB Atlas. Do **not** run `seed` / `staff`
against the production MariaDB; copy the real data instead:

```bash
cd server
npm install                                   # includes the optional `mongodb` driver used only by the copy
# 1. Create the database + user in DirectAdmin (MySQL Management), then in server/.env:
#    DATABASE_URL=mysql://DBUSER:DBPASS@localhost:3306/DBNAME
#    MONGODB_URI=<the Atlas connection string>
npm run db:schema                             # 2. tables
npm run db:copy-from-mongo -- --dry-run       # 3. counts, unknown fields, validation failures; writes nothing
npm run db:copy-from-mongo                    # 4. copy (upsert by id, safe to re-run); exits 1 on any mismatch
# 5. restart the Node app, then:
curl -s https://maximsinterior.com.ng/api/health   # expect {"ok":true,...,"db":{"ok":true}}
```

The copy keeps every Mongo ObjectId as the row id, all timestamps, and the bcrypt
password hashes, so staff sign in with their current passwords. If a document fails
validation (e.g. an old status value), fix it or re-run with `--lenient`. If `seed` or
`staff` were already run on the target, add `--truncate` to empty the tables first.
`npm run test:copy` tests the copy against throwaway Mongo + MariaDB databases.
`npm run test:db` runs an end-to-end API smoke test; point `TEST_DATABASE_URL` at a throwaway database.

## 2. Run the frontend

```bash
# from the project root
npm install
cp .env.example .env          # set VITE_API_URL=http://localhost:4000
npm run dev                   # http://localhost:5173
```

Sign in at `/admin/login` after choosing a password from the set-up link `npm run staff` emails (or `npm run staff -- --print-links`).

---

## 3. Environment variables

**Frontend (`.env`)** — browser-exposed, public only: `VITE_API_URL`, `VITE_PAYMENT_PROVIDER`, `VITE_SQUAD_PUBLIC_KEY`, `VITE_PAYSTACK_PUBLIC_KEY`.

**Server (`server/.env`)** — all secrets live here. See `server/.env.example`:
core (`PORT`, `CLIENT_ORIGIN`, `API_URL`, `APP_URL`), `DATABASE_URL`, `JWT_SECRET`, storage (`STORAGE_DRIVER=local|cloudinary` + `CLOUDINARY_*`), payments (`SQUAD_SECRET_KEY`, `SQUAD_WEBHOOK_SECRET`, `PAYSTACK_SECRET_KEY`), email (`EMAIL_PROVIDER=smtp|resend` + `SMTP_*` / `RESEND_API_KEY`, `MAIL_FROM`, `NOTIFICATION_EMAIL`).

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
4. Set `DATABASE_URL` to a MariaDB/MySQL database and run `npm run db:schema`. Existing site: `npm run db:copy-from-mongo` (see above). Brand-new empty site only: `npm run seed`, `npm run seed:photos`, `npm run staff`.
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
