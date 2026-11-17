# EDX Decals: Next.js + Supabase + PayMongo

This is the upgraded version of the PHP/SQLite **edx.decals** sticker shop. The storefront flow and business rules are unchanged: products with colour and texture options, the cart, Sale Mode, order tickets, tracking, custom requests, the Custom Wall, the admin area and the five palettes. It now also has **real online payment** (GCash, Maya, card and QR Ph through PayMongo) and can be hosted on **Vercel** with **Supabase** and **GitHub**.

The design comes from the **EDX Decals Web Pack**. `src/styles/tokens.css`, `base.css` and `components.css` are the pack's CSS, and the icons are the pack's 68-icon set (`src/components/Icon.tsx`). It keeps the pack's cut corners, night-first look, 16px minimum body text and large-text option.

---

## Folder map

```
edx-decals-next/
├── README.md, MANIFEST.txt, VERIFICATION-REPORT.txt
├── package.json, tsconfig.json, next.config.mjs, middleware.ts, .env.example, .gitignore
├── supabase/
│   ├── migrations/0001_schema.sql   tables, order-ticket trigger, place_order() checkout transaction
│   ├── migrations/0002_security.sql Row Level Security, admin check, storage buckets
│   └── seed.sql                     settings row + the starter catalogue
├── scripts/
│   ├── migrate-from-sqlite.mjs      imports legacy/database.sqlite + legacy/uploads/
│   ├── check-ts.mjs                 syntax check of every .ts/.tsx file
│   └── verify.py                    pack verification (writes VERIFICATION-REPORT.txt)
├── public/  images/ (sticker art)  brand/ (EDX symbol light/dark, favicon)
└── src/
    ├── styles/      tokens.css · base.css · components.css (web pack) · app.css (app-only parts)
    ├── lib/         pricing, PayMongo, Supabase clients, data access, uploads, charts, options
    ├── components/  header, footer, product card/detail, cart, checkout, forms, icons, admin shell
    └── app/
        ├── (store)/   / · shop · product/[id] · cart · checkout · track-order · custom · contact
        │              payment/success · payment/cancelled · quote/[token]
        ├── admin/login
        ├── admin/(panel)/  dashboard · orders · products · categories · custom-orders
        │                   requests · sales · sale · theme · users
        └── api/       checkout · webhooks/paymongo · auth/signout
```

## How payment works

```
Cart (browser) ─▶ /api/checkout ─▶ server reprices from DB ─▶ place_order() (payment: pending)
                                 ─▶ PayMongo Checkout Session ─▶ customer pays (GCash/Maya/card/QR Ph)
PayMongo ─▶ /api/webhooks/paymongo ─▶ signature check ─▶ event stored once ─▶ amount check ─▶ order = PAID
```

- The browser never sends prices. The server reads them from Supabase and applies Sale Mode itself.
- An order only becomes **Paid** through the signed webhook. Coming back to the success page is not enough.
- Payment status (`pending · paid · failed · expired · refunded · offline`) is separate from fulfilment status (`received → processing → printing → ready → shipped → completed`).
- **Offline** means paid by cash or bank transfer. An admin sets it on the order page.
- Custom requests: the admin sets a quote and copies the link `/quote/<token>`. The customer pays it, and the request moves to **In Progress**.

---

## Set it up (first time)

### 1. Supabase
1. Create a project at supabase.com.
2. Open **SQL Editor** and run these files in order: `supabase/migrations/0001_schema.sql`, then `0002_security.sql`, then `supabase/seed.sql`. Skip the seed products if you plan to import your real data in step 4.
3. Open **Project Settings → API** and copy the Project URL, the anon key and the service_role key.

### 2. Local project
```powershell
cd edx-decals-next
copy .env.example .env.local      # macOS/Linux: cp .env.example .env.local
# fill in the Supabase and PayMongo values
npm install
npm run dev                        # http://localhost:3000
```

### 3. PayMongo (use test mode first)
1. In the PayMongo dashboard, copy your **test** secret key (`sk_test_...`) into `PAYMONGO_SECRET_KEY`.
2. Set `PAYMONGO_METHODS` to the methods that are switched on for your account (default: `gcash,paymaya,card,qrph`).
3. Register the webhook. It needs a public URL, so deploy to Vercel first (step 6) and then run:
```bash
curl -X POST https://api.paymongo.com/v1/webhooks \
  -u sk_test_YOUR_KEY: \
  -H "Content-Type: application/json" \
  -d '{"data":{"attributes":{"url":"https://YOUR-DOMAIN/api/webhooks/paymongo","events":["checkout_session.payment.paid"]}}}'
```
4. Put the `secret_key` from the response (`whsk_...`) into `PAYMONGO_WEBHOOK_SECRET` in Vercel, then redeploy.

### 4. Import the old shop data (optional)
```powershell
mkdir legacy
# copy the old app's database.sqlite and the whole uploads\ folder into legacy\
npm run migrate:sqlite -- --dry-run
npm run migrate:sqlite
```
Old orders were never paid online, so the import marks them **offline** (paid outside the site). The exceptions are **received** orders, which are imported as pending, and **cancelled** orders, which are imported as failed. Admin passwords are not imported.

### 5. Create your admin account
1. In Supabase, go to **Authentication → Users → Add user**, then enter your email and a password.
2. In the **SQL Editor**, run:
```sql
insert into public.admins (user_id, display_name)
select id, 'Shop Admin' from auth.users where email = 'you@example.com';
```
3. Sign in at `/admin/login`. Add more admins from **Admin users**. New people get an invite email.

### 6. Deploy (GitHub + Vercel)
1. Push the folder to a GitHub repository. `.env.local` and `legacy/` are already in `.gitignore`.
2. In Vercel, choose **Add New → Project** and import the repository. The framework is detected as Next.js.
3. Add every key from `.env.example` under **Settings → Environment Variables**. Set `NEXT_PUBLIC_SITE_URL` to your real domain.
4. Deploy, register the webhook (step 3) and test with the PayMongo **test** key.
5. Switch to the **live** keys only after every item on the go-live checklist passes.

---

## Theming

- **Palette** (Yellow / Blue / Noel / Araw / Fiesta) is chosen by the admin on **Admin → Theme**. It is saved in `settings.site_palette` and applies to the shop and the admin area.
- **Night/light mode and large text** are chosen by each visitor with the header toggles. The choice is saved in `localStorage` (`edx-mode`, `edx-text`). **The default is night.**
- To change a colour, edit `src/styles/tokens.css`. Components only use variables, so everything follows. Keep night backgrounds near-black (never `#000`) and recheck contrast.
- Fonts are Manrope (body) and Space Grotesk (display/UI), loaded by `next/font` and self-hosted at build time.
- Logo: black ink on light, soft-white ink on night, and never recoloured. The symbol files are in `public/brand/`. To use the full EDX wordmark, put `wordmark-light.svg` and `wordmark-dark.svg` from the web pack's `logo/` folder into `public/brand/` and point `src/components/Logo.tsx` at them.

## What changed from the PHP version

| PHP app | Next.js app |
|---|---|
| SQLite file | Supabase PostgreSQL with Row Level Security |
| `uploads/` folder | Supabase Storage: `products` (public) and `custom-orders` (private, signed URLs) |
| `$_SESSION['cart']` | Browser cart, repriced on the server |
| `admin_users` + seeded `admin/admin123` | Supabase Auth + `admins` table. No default password. |
| Orders saved without payment | PayMongo checkout + verified webhook |
| Revenue = every order | Revenue = paid + offline orders and paid quotes only |
| One active order per email | Removed. Customers can place several orders. |
| Track by ticket only | Ticket **and** email. Tickets are sequential and would otherwise reveal customer details. |
| SVG uploads from customers | Customers: JPG/PNG/WEBP/GIF only (checked by real file type). Admins: SVG allowed if it has no scripts. |
| `router.php`, `.htaccess` | App Router. Old `.php` URLs redirect (see `next.config.mjs`). |
| Colours/textures as JSON text | `jsonb` columns `colors` / `textures`. A colour's variant image is stored on the colour itself. |

## Go-live checklist
- [ ] Products, categories, gallery and variant images show correctly
- [ ] Cart totals match the PHP version, with and without Sale Mode (all / selected)
- [ ] Checkout creates an order with payment **pending** and opens PayMongo
- [ ] A test payment turns the order **paid** (via the webhook only)
- [ ] Cancelling on PayMongo leaves the order unpaid and the cart intact
- [ ] Sending the same webhook twice does not process it twice
- [ ] Track Order needs ticket + email and shows payment + fulfilment status
- [ ] A custom request upload works, the quote link opens, and paying it moves the request to In Progress
- [ ] `/admin` redirects to login and a non-admin account is refused
- [ ] Night/light, large text and all five palettes look right, on a phone too
- [ ] Live PayMongo keys and the live webhook secret are set in Vercel

## Commands
| Command | Does |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` / `npm start` | production build / run |
| `npm run typecheck` | TypeScript check (after `npm install`) |
| `npm run migrate:sqlite` | import the old shop data |
| `node scripts/check-ts.mjs` | syntax-check every TS/TSX file |
| `python scripts/verify.py` | verify the package and write VERIFICATION-REPORT.txt |
