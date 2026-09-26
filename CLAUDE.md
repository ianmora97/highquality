# HighQuality Studio — Project Reference

## Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js + Express 4 |
| Views | express-handlebars (`.hbs`), layouts in `src/backend/views/layouts/` |
| Database | MongoDB via Mongoose 8 |
| CSS | **Tailwind CSS v4** (CSS-first, built from `src/public/css/input.css` → `src/public/css/tailwind.css`) |
| JS interactivity | **Alpine.js v3** (deferred, in layouts) |
| Notifications | **Twilio** (WhatsApp) + **Telegram Bot API** (axios) |
| Realtime | Socket.IO v4 |
| Calendar | FullCalendar v6 (`themeSystem: 'standard'`, NOT 'bootstrap') |
| Auth | **Passport.js** (local-staff, local-client, jwt strategies) + **argon2id** hashing, cookie `hq_token` (httpOnly) |
| Scheduling | node-cron |
| Process | `npm run dev` (nodemon), `npm run css` (Tailwind build) |

## CSS Build

**Claude Code must NEVER run `npm run css` or `npm run css:watch`.** The user always keeps `npm run css:watch` running in a terminal during development — it rebuilds `tailwind.css` automatically on every save. Just edit `src/public/css/input.css` and stop; do not invoke any build command for it, and do not tell the user to run it (it's already running).

```bash
npm run css          # one-shot build (user runs manually, e.g. before a prod deploy)
npm run css:watch    # watch mode (user keeps this running at all times in dev — never start/stop it yourself)
```

Source: `src/public/css/input.css`  
Output: `src/public/css/tailwind.css` (committed, served as static)

Tailwind v4 config is **CSS-first** — no `tailwind.config.js`. All config lives in `@theme {}` block inside `input.css`.

## Bootstrap Compat Layer

Bootstrap was replaced with Tailwind, but JS files generate HTML with Bootstrap class names. Two compat mechanisms keep them working:

1. **CSS compat layer** in `input.css` — defines Bootstrap utility classes (`.d-flex`, `.fw-bold`, `.btn-check`, `.dropdown-item`, `.table-striped`, etc.) as plain CSS. When adding new Bootstrap classes from JS, add them here.

2. **JS Modal shim** in both layout files (`main.hbs`, `admin.hbs`) — provides `window.bootstrap.Modal` API and `jQuery.fn.modal` plugin. Delegated click handlers handle `data-bs-dismiss` and `data-bs-toggle="modal"` attributes. Modal CSS: `.modal { display: none }` → `.modal.modal-open { display: flex }`.

**Do NOT add Bootstrap CSS or JS CDN links.** The compat layer is intentional.

## Route Structure

| Path | Auth | View |
|------|------|------|
| `GET /` | public | `client/index` |
| `GET /reservar` | public | `client/reservar` |
| `GET /galeria` | public | `client/gallery` |
| `GET /servicios` | public | `client/servicios` |
| `GET /ingresar` | public | `auth/client-login` (layout: `auth`) |
| `GET /registro` | public | `auth/client-register` (layout: `auth`) |
| `GET /dashboard` | public | `auth/admin-login` (layout: `auth`) |
| `POST /dashboard/login` | public | → auth.controller.loginStaff → sets `hq_token` cookie |
| `GET /dashboard/panel` | requirePage('admin') | `admin/index` |
| `GET /dashboard/servicios` | requirePage('admin') | `admin/servicios` |
| `GET /dashboard/horarios` | requirePage('admin') | `admin/horarios` |
| `GET /dashboard/clientes` | requirePage('admin') | `admin/clients` |
| `GET /dashboard/reviews` | requirePage('admin') | `admin/reviews` |
| `POST /api/v1/auth/client/login` | public | client login by phone |
| `POST /api/v1/auth/client/register` | public | client registration |
| `POST /api/v1/auth/logout` | any | clears `hq_token`, deletes session |
| `* /api/v1/*` | mixed | JSON API |
| `* /scripts/*` | public | npm packages as static |

## Layouts

- `main.hbs` — client-facing pages, includes `{{>client/header}}`
- `admin.hbs` — admin panel pages, includes `{{>admin/header}}`
- `auth.hbs` — minimal shell (no nav) for all auth pages: admin-login, client-login, client-register
- `app.hbs` — client account shell (`/app/*` routes), includes logout + nav

## Key Files

| File | Purpose |
|------|---------|
| `src/server.js` | Express setup, Socket.IO, HTTP/HTTPS server |
| `src/public/css/input.css` | Tailwind source + Bootstrap compat layer |
| `src/backend/routes/render.routes.js` | Client page routes |
| `src/backend/routes/admin.routes.js` | Admin page routes |
| `src/backend/routes/api.routes.js` | REST API routes |
| `src/backend/config/passport.js` | Passport strategies (local-staff, local-client, jwt) |
| `src/backend/helpers/password.js` | argon2id hash/verify |
| `src/backend/helpers/token.js` | signToken, setAuthCookie, clearAuthCookie (`hq_token`) |
| `src/backend/controllers/auth.controller.js` | loginStaff, loginClient, registerClient, logout |
| `src/backend/routes/auth.routes.js` | `/api/v1/auth/*` — client auth endpoints |
| `src/backend/middlewares/auth.js` | requirePage(role), requireApi(role), attachUser |
| `src/backend/middlewares/book.js` | addProps (booking middleware) |
| `src/backend/helpers/whatsapp.js` | Twilio WhatsApp via content template |
| `src/backend/helpers/telegram.js` | Telegram Bot API notification |
| `src/backend/helpers/cron.js` | node-cron jobs (disabled in server.js) |
| `src/backend/connections/mongo.js` | Mongoose connection |
| `src/backend/connections/socket.js` | Socket.IO helpers |
| `src/backend/test/seedAuth.js` | Seed roles + staff users (`npm run auth:seed`) |

## Public JS Files

| File | Page |
|------|------|
| `src/public/js/client/index.js` | Homepage (Splide carousel, review form) |
| `src/public/js/client/reserva.js` | Booking page (FullCalendar, Socket.IO slots) |
| `src/public/js/admin/index.js` | Admin panel (FullCalendar, KPI, charts) |
| `src/public/js/admin/servicios.js` | Services CRUD |
| `src/public/js/admin/horarios.js` | Schedule CRUD |
| `src/public/js/admin/clientes.js` | Clients DataTable |
| `src/public/js/admin/reviews.js` | Reviews list |
| `src/public/js/auth/login.js` | Alpine factories: staffLogin(), clientLogin(), clientRegister() |

## Icons

- FontAwesome **Free** → `/fonts/icons/free/css/all.css`
- FontAwesome **Pro** → `/fonts/icons/pro/css/all.css` (needed for `fa-duotone` used in calendar event templates)

Both are linked in `main.hbs` and `admin.hbs`.

## Environment Variables (`.env`)

```
PORT=
HOST=
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES=7d
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TELEGRAM_TOKEN=
TELEGRAM_CHAT_ID=
NODE_ENV=dev|prod
# Google OAuth (leave empty — strategy not registered if absent)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```

## MongoDB Models

| Model | Collection | Description |
|-------|-----------|-------------|
| Event | events | Appointments/bookings |
| Client | clients | Legacy customer records (booking lookup by phone) |
| Services | services | Haircut services |
| Horario | horarios | Business hours |
| Reviews | reviews | Client reviews |
| Special | specials | Special day closures |
| **User** | **users** | Unified user accounts (staff + clients) |
| **Rol** | **rols** | Roles: client(1), admin(2), su(3) |
| **UserRol** | **userrols** | One role per user (unique on `user` field) |
| **Session** | **sessions** | Active JWT sessions — jti + TTL expiry (single session per user) |

## Booking Flow

1. Client visits `/reservar` → FullCalendar loads events from `GET /api/v1/event`
2. Client clicks time slot → modal opens with service selection
3. `POST /api/v1/event/book` → `addProps` middleware → event created
4. Socket.IO emits slot removal to other connected clients
5. `sendWhatsappMessage` + `sendTelegramMessage` notify the barber

## Common Tasks

```bash
npm run dev          # start dev server
npm run css:watch    # rebuild CSS on change
npm run auth:seed    # create roles + staff users (admin + superuser) — idempotent
npm run seed         # seed services, horarios (legacy)
```

## Auth System

### Architecture
- **Passport.js** with three strategies: `local-staff` (username/email), `local-client` (phone), `jwt` (cookie extraction + jti check)
- **argon2id** hashing — `src/backend/helpers/password.js`
- **Single active session per user** — `sessions` collection upserted on each login (old jti invalidated automatically)
- **Cookie**: `hq_token`, httpOnly, sameSite: lax, secure in prod, 7-day TTL
- **Google OAuth** skeleton in `config/passport.js` — NOT implemented; `GOOGLE_CLIENT_ID` triggers registration

### Middleware
- `requirePage(minRole)` — page guard; redirects to `/dashboard` or `/ingresar` on fail
- `requireApi(minRole)` — API guard; returns 401/403 JSON on fail
- `attachUser` — optional; attaches `req.user` but never redirects (used on `/reservar`)
- Role levels: `client=1`, `admin=2`, `su=3` — higher level passes lower-level guards

### Login credentials (default seed)
| User | Password | Role |
|------|----------|------|
| `admin` | `HQ@Admin2025!` | admin |
| `superuser` | `HQ@Su2025!` | su |

### Auth Login Views
All use layout `auth` (`views/layouts/auth.hbs`). Mobile-first, pure Tailwind, Alpine reactive:
- `views/auth/admin-login.hbs` — staff: username/email + password
- `views/auth/client-login.hbs` — client: phone (8 digits) + password
- `views/auth/client-register.hbs` — client: name + phone + password + confirm + strength meter

### Backward Compatibility
Legacy routes `/api/v1/client/auth/login|register|logout` still work — they point to the new auth controller. Auth controller accepts both old field names (`numero`/`nombre`) and new (`phone`/`name`).

## Alpine.js Patterns Used

- Mobile menu toggle: `x-data="{ open: false }"` on nav wrapper
- Icon picker dropdown in servicios: `x-data="{ open: false }"` + `@click.away="open = false"`
- Active nav state set via inline JS reading Handlebars `{{tab}}` variable

## Admin Dashboard Design

All admin pages use **pure Tailwind CSS** — no custom CSS classes in HBS templates, no inline `style=""` attributes for visual styling. Only `style="display:none;"` is allowed for JS-controlled visibility.

### Admin Page Container
```html
<div class="max-w-screen-xl mx-auto px-4 sm:px-6 py-4">
```

### Admin Header Card (top of each page)
```html
<div class="bg-[#0d0d0d] border border-white/8 rounded-xl p-4 mb-4">
    <h1 class="text-xl font-bold mb-1 flex items-center gap-2">
        <i class="fa-solid fa-icon text-primary"></i> Page Title
    </h1>
    <p class="text-gray-500 text-sm mb-0">Description</p>
</div>
```

### Admin Nav Active State
- **Desktop nav**: JS removes `text-gray-400`, adds `text-yellow-400 bg-yellow-400/10`
- **Mobile panel**: JS applies inline `color:#fff; background:rgba(48,4,243,0.15); border-left:3px solid #3004f3`
- Active state is driven by `{{tab}}` Handlebars variable in `header.hbs` script block

### CSS Component Classes (JS-depended, defined via `@layer components` + `@apply`)
These classes must stay because JS references them by name or toggles `.active` on them:

| Class | Used by | Active state color |
|-------|---------|-------------------|
| `.cal-view-btn` | Admin calendar view buttons | `bg-primary border-primary text-white` |
| `.active-cerrado` | Cerrado toggle in index.js | `bg-danger/10 text-danger border-danger/30` |
| `.icon-type-btn` | Servicios icon type picker | `bg-primary/18 text-white border-primary/45` |
| `.override-type-btn` | Overrides type picker | `bg-danger/15 text-red-400 border-danger/40` |
| `.fa-icon-btn` | FA icon grid picker | `border-gold/50 bg-gold/10 text-gold` |
| `.fa-icon-grid` | FA icon grid container | grid layout, `bg-white/[.03] border border-white/8` |
| `.image-upload-area` | Image upload in servicios/galería | hover: `border-primary/50 bg-primary/[.04]` |

Do NOT remove these from `input.css` — they are required by the JS files.

### KPI Gradient Card Pattern (established 2026-09-26)
All admin KPI/stat cards and calendar buttons use a **gradient-tinted** look — flat `bg-primary/8` cards are the old style, no longer the standard for new cards. Full recipe in `design.md` under "KPI Gradient Card". Each stat gets its own hue (violet/orange-red/emerald/blue) with a matching gradient icon badge — never reuse the same hue for two adjacent KPI cards.

## FullCalendar Notes

- Always use `themeSystem: 'standard'` — the `bootstrap` theme requires Bootstrap CSS which is removed
- `@fullcalendar/bootstrap5` script tag must NOT be included
- Calendar locale is set to Spanish (`locale: 'es'`)

## Booking Slot Business Rules

- All appointments and services last **30 minutes** (one slot).
- **Future-day bookings**: clients can only book on the hour (e.g. 9:00, 10:00). Internally stored as 30-min slots in the DB.
- **Same-day bookings**: half-hour slots (e.g. 9:30, 10:30) are unlocked **only for the current day**, starting at 12:00 AM (midnight) of that day, and they stay available **at all times throughout that whole day** — there is NO time-of-day cap (do not gate them to a morning window). The ONLY condition is `date.isSame(moment(), 'day')`. Generated by `additionalHalfHourSlots()` in `reserva.js`. Booked slots are still removed via `removeHoursBookedfromthatday()`.
- **Past slots**: for the current day, any slot whose time has already passed (`isAfter(now)` is false) is removed from the grid. Future days show all slots.
- **Nocturnal panel** (`#noctural`): the "Turnos de 30 min disponibles." banner appears **only between 00:00 and 06:00** of the current day, then disappears at 6:00 AM. This is just the panel — the half-hour slots themselves remain available all day (see `showNocturnalSchedule()`).
- **UI consequence**: the "Media hora" badge and the slot-type legend (`#time-legend`) must only appear when half-hour slots are actually present in the rendered grid. Never show "Hora completa" label — the user doesn't need to know this distinction. Only label half-hour slots to help the user identify them when they coexist with full-hour slots.
