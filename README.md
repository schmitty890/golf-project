# VOLW Firewood

**Online firewood ordering for The Vineyards on Lake Wylie.** Customers order bundles for
pickup or delivery and **schedule a specific hour window**; the owner gets a simple day-of
list of what to set out or deliver and when — so wood never sits at the curb all day.

It's three things in one app:

- a **marketing homepage** (what you sell, pricing, reviews, FAQ),
- a **customer ordering + scheduling** flow, and
- an **admin console** for running the business.

---

## Customer features

**Homepage**
- Hero, value props ("Clean · Convenient · Local"), how-it-works, pricing, and an optional photo gallery.
- **"What neighbors say"** reviews carousel (shows real approved reviews; falls back to sample quotes until you approve some).
- FAQ section and a launch/promo announcement bar.

**Accounts**
- Register / log in (JWT). **Guests can order without an account.**
- Account settings: name, profile photo (upload/remove), change password, delete account.
- Expired/invalid sessions redirect to login automatically.

**Ordering** (`/order`)
- Choose **Pickup** or **Delivery** bundle (cards with icons), a **Seasonal Pack** (only shown when in season), or a **Subscription**.
- **Quantity** quick-pick buttons (1–6) plus a custom amount; delivery has a 2-bundle minimum.
- **Live price estimate** updates as you choose.
- Optional **neighborhood** dropdown for deliveries.

**Scheduling** (the heart of it)
- Pick a date on a **calendar**, then select **one or more 1-hour windows** that work.
- **Minimum advance notice** (next-day by default) — today/within-notice dates are blocked.
- **"In a pinch?" rush option** unlocks sooner dates (down to same-day) for a percentage surcharge — *subject to the owner's availability/confirmation*.
- Dates the owner has marked closed (out of town) or limited are greyed out.

**Tracking & feedback**
- **My Orders** (`/my-orders`): order history with a status timeline and the scheduled window.
- **Leave feedback**: a 1–5 star review modal from the homepage and My Orders. Reviews are held for approval before appearing publicly.

---

## Admin features

Admin pages appear in the sidebar for any user whose account `role` is `admin`.

- **Schedule** (`/admin/schedule`) — the day-of **run-sheet**. Upcoming orders grouped by date and sorted by hour window, labeled **Curb pickup** vs **Deliver**, with quantity, address/neighborhood, and tap-to-call phone. **Confirm a customer's window with one click**, then **Mark done** when it's picked up/delivered.
- **Orders** (`/admin/orders`) — full list with status/type filters, one-click window confirm, a manual schedule editor, admin notes, and delete.
- **Availability** (`/admin/availability`) — a calendar to **close specific dates or a vacation range** or limit which windows are open per date, plus **Scheduling rules**: minimum-notice days, whether rush is offered, and the rush surcharge %.
- **Feedback** (`/admin/feedback`) — moderate reviews: **approve / reject / edit / delete**, and see who submitted each (account email or "Guest").

---

## How the order flow works, end to end

1. A customer places an order and schedules a date + hour window(s) (or requests a rush).
2. The order shows up under **Orders** and **Schedule** as `pending`.
3. The owner opens **Schedule**, taps to **confirm one window** (status → `confirmed`).
4. The owner sets the wood out / delivers during that window and taps **Mark done** (status → `delivered`), which clears it off the run-sheet.
5. Separately, customer reviews stay hidden until approved under **Feedback**; approved ones appear in the homepage carousel.

---

## Where to change common things

| Edit this file | To change |
| --- | --- |
| `client/src/data/business.js` | Business name, contact email, service area, promo/announcement bar, gallery photos, social links |
| `client/src/data/pricing.js` | Bundle prices, seasonal packs + their in-season date windows, subscription plans, weekdays, and `TIME_WINDOWS` (the 1-hour slots offered) |
| `client/src/data/neighborhoods.js` | The neighborhood dropdown list — **currently placeholders; replace with the real Vineyards sub-neighborhoods** |
| `client/src/data/testimonials.js` | Fallback homepage quotes shown until real reviews are approved |
| `client/src/data/faqs.js` | Homepage FAQ entries |
| `client/public/photos/` + `business.galleryPhotos` | Real photos: drop image files in the folder and list them in `galleryPhotos` |

**Pricing today:** Pickup Bundle $7 · Delivered Bundle $12 (2-bundle min) · Fall Firepit Pack $33 (3) · Winter Warmth Pack $50 (5) · Holiday Hosting Pack $54 (6) · Monthly $22/mo · Bi-Weekly $40/mo · Seasonal from $108.

**Lead time & rush** are managed in **Admin → Availability** (not in code): default is next-day notice with rush enabled at 25%.

**Making someone an admin:** set their `role` to `admin` on their User record in MongoDB.

---

## Tech stack

- **Client:** React, React Router, Tailwind CSS, axios.
- **Server:** Express, Mongoose, JWT auth, bcrypt password hashing.
- **Database:** MongoDB Atlas.
- **API docs:** Swagger UI at `/api-docs`.

## Run locally

```bash
# 1. Install everything (root, server, client)
npm run install-all

# 2. Configure the server environment — create server/.env:
#    MONGODB_URI=your_mongodb_atlas_connection_string
#    JWT_SECRET=your_secure_random_string
#    PORT=5001
#    (optional) client: set REACT_APP_API_URL if the API isn't on http://localhost:5001

# 3. Start the server (nodemon) and client (CRA) together
npm run dev
```

The client runs on `http://localhost:3000` and the API on `http://localhost:5001`.

### Email notifications (optional)

The app emails an **order confirmation** to the customer, a **new-order alert** to the owner,
and **"window confirmed"** / **"thank-you"** updates as orders progress. Until SMTP is
configured these emails **silently no-op** (they just log), so everything works without it.

To turn them on, add to `server/.env`:

```
SMTP_HOST=smtp.gmail.com         # or your provider (Resend, SendGrid, Mailgun…)
SMTP_PORT=587
SMTP_USER=you@gmail.com          # Gmail needs an App Password, not your login password
SMTP_PASS=your_app_password
MAIL_FROM="VOLW Firewood <you@gmail.com>"
OWNER_EMAIL=you@gmail.com        # where new-order alerts go
BUSINESS_NAME=VOLW Firewood
SERVICE_AREA=The Vineyards on Lake Wylie
VENMO_HANDLE=your-venmo-username  # shown as payment instructions in emails
SITE_URL=https://your-site-url    # optional; adds a "leave a review" link
```

**Useful scripts** (run inside `client/` or `server/`): `npm run lint`, `npm run lint:fix`, `npm run build` (client), `npm test` (server).

## Deploy (DigitalOcean)

Env vars get set in **two places**: the **backend** (Node service) and the **frontend** (static site, build-time).

### Backend (Node service) → Settings → Environment Variables

| Variable | Example / value | Notes |
| --- | --- | --- |
| `MONGODB_URI` | your Atlas connection string | 🔒 encrypt |
| `JWT_SECRET` | long random string | 🔒 encrypt |
| `PORT` | *(skip on App Platform)* | App Platform injects `$PORT` automatically; the server already uses it. Only set it on a plain Droplet. |
| `SMTP_HOST` | `smtp.gmail.com` | |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | `volwfirewood@gmail.com` | |
| `SMTP_PASS` | your 16-char Gmail App Password | 🔒 encrypt; **no spaces** |
| `MAIL_FROM` | `VOLW Firewood <volwfirewood@gmail.com>` | no surrounding quotes in the DO UI |
| `OWNER_EMAIL` | `volwfirewood@gmail.com` | where new-order alerts go |
| `BUSINESS_NAME` | `VOLW Firewood` | |
| `SERVICE_AREA` | `The Vineyards on Lake Wylie` | |
| `VENMO_HANDLE` | `Jason-Schmitt-89` | shown as payment instructions |
| `SITE_URL` | `https://volwfirewood.com` | front-end URL; used for the "leave a review" email link **and Stripe checkout redirects** — set to the live domain when cards are on |
| `STRIPE_SECRET_KEY` | `sk_live_…` (test: `sk_test_…`) | 🔒 encrypt; enables card checkout (empty = card off, Venmo only) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_…` | public key (safe to expose) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | 🔒 encrypt; from the Stripe webhook endpoint — lets paid card orders auto-mark "paid" |

### Frontend (static site) → build-time

| Variable | Value | Notes |
| --- | --- | --- |
| `REACT_APP_API_URL` | the backend's public URL (e.g. `https://your-api.ondigitalocean.app`) | **Baked in at build time** — set on the static-site component and **rebuild/redeploy the frontend** after any change. If wrong, the site loads but every order/login call fails. |

**Gotchas:** encrypt the three secrets (`MONGODB_URI`, `JWT_SECRET`, `SMTP_PASS`); don't wrap values in quotes in the DO UI; no spaces in the App Password; email silently no-ops until the SMTP vars are set; CORS is open server-side, so there's no CORS variable to configure.

## Going live (custom domain + card payments)

Stack: **front-end on Netlify**, **backend (API) on DigitalOcean**. When you buy the domain (e.g. `volwfirewood.com`) and turn on real card payments:

1. **Domain → Netlify.** Add `volwfirewood.com` as the custom domain on the Netlify front-end and point DNS as Netlify instructs (HTTPS is automatic).
2. **Netlify (front-end) env.** Confirm `REACT_APP_API_URL` = the DigitalOcean API URL, then **rebuild/redeploy** (it's baked in at build time).
3. **DigitalOcean (backend) env.** Set `SITE_URL=https://volwfirewood.com`; swap in **live** Stripe keys (`STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_PUBLISHABLE_KEY=pk_live_…`); encrypt the secret key. Restart.
4. **Stripe (Live mode).** Finish account **activation** (business + bank details) so live charges work. Then Developers → **Webhooks → Add endpoint** → `https://<your-api-host>/api/webhooks/stripe`, event `checkout.session.completed` → copy its **signing secret** into `STRIPE_WEBHOOK_SECRET` on DigitalOcean and restart.
5. **Smoke test.** Place one small real card order → it should show **Card — paid** in Admin → then **refund** it in Stripe.

> `SITE_URL` (the front-end domain, used for redirects + email links) and the **webhook URL** (your API host) are **different hosts** — don't point them at the same place.

Until live keys are set, card checkout stays off and the site runs on Venmo exactly as before.

## Project structure

```
client/                      # React app
  public/photos/             # Drop gallery images here
  src/
    components/              # StarRating, FeedbackModal, ReviewsCarousel, MonthCalendar, layout/…
    data/                    # business, pricing, neighborhoods, testimonials, faqs
    pages/                   # Home, Order, MyOrders, Account, Login, Register
    pages/admin/             # AdminSchedule, AdminOrders, AdminAvailability, AdminFeedback
    utils/                   # orderDisplay, dates
    context/AuthContext.js
server/                      # Express API
  models/                    # User, Order, Settings, Feedback
  routes/                    # auth, orders, settings, feedback
  middleware/                # auth (JWT), requireAdmin
  server.js
```

---

> Note: `CHANGELOG.md` predates the firewood rebuild and is out of date — ignore it (or ask for a cleanup).
