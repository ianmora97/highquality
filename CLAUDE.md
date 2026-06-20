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
| Auth | JWT (jsonwebtoken) + bcrypt, cookie-based |
| Scheduling | node-cron |
| Process | `npm run dev` (nodemon), `npm run css` (Tailwind build) |

## CSS Build

```bash
npm run css          # one-shot build
npm run css:watch    # watch mode
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
| `GET /dashboard` | public | `admin/login` (layout: `login`) |
| `POST /dashboard/login` | public | → sets JWT cookie |
| `GET /dashboard/panel` | JWT verify | `admin/index` |
| `GET /dashboard/servicios` | JWT verify | `admin/servicios` |
| `GET /dashboard/horarios` | JWT verify | `admin/horarios` |
| `GET /dashboard/clientes` | JWT verify | `admin/clients` |
| `GET /dashboard/reviews` | JWT verify | `admin/reviews` |
| `* /api/v1/*` | mixed | JSON API |
| `* /scripts/*` | public | npm packages as static |

## Layouts

- `main.hbs` — client-facing pages, includes `{{>client/header}}`
- `admin.hbs` — admin panel pages, includes `{{>admin/header}}`
- `login.hbs` — minimal, no nav (used only for admin login)

## Key Files

| File | Purpose |
|------|---------|
| `src/server.js` | Express setup, Socket.IO, HTTP/HTTPS server |
| `src/public/css/input.css` | Tailwind source + Bootstrap compat layer |
| `src/backend/routes/render.routes.js` | Client page routes |
| `src/backend/routes/admin.routes.js` | Admin page routes |
| `src/backend/routes/api.routes.js` | REST API routes |
| `src/backend/middlewares/auth.js` | JWT verify + cipherPassword |
| `src/backend/middlewares/book.js` | addProps (booking middleware) |
| `src/backend/helpers/whatsapp.js` | Twilio WhatsApp via content template |
| `src/backend/helpers/telegram.js` | Telegram Bot API notification |
| `src/backend/helpers/cron.js` | node-cron jobs (disabled in server.js) |
| `src/backend/connections/mongo.js` | Mongoose connection |
| `src/backend/connections/socket.js` | Socket.IO helpers |
| `src/backend/test/createAdmin.js` | Seed admin user (`npm run admin`) |

## Public JS Files

| File | Page |
|------|------|
| `src/public/js/client/index.js` | Homepage (Splide carousel, review form) |
| `src/public/js/client/reserva.js` | Booking page (FullCalendar, Socket.IO slots) |
| `src/public/js/admin/index.js` | Admin panel (FullCalendar, KPI, Selectize) |
| `src/public/js/admin/servicios.js` | Services CRUD |
| `src/public/js/admin/horarios.js` | Schedule CRUD |
| `src/public/js/admin/clientes.js` | Clients DataTable |
| `src/public/js/admin/reviews.js` | Reviews list |

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
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TELEGRAM_TOKEN=
TELEGRAM_CHAT_ID=
NODE_ENV=dev|prod
```

## MongoDB Models

| Model | Collection | Description |
|-------|-----------|-------------|
| Event | events | Appointments/bookings |
| Client | clients | Customer records |
| Services | services | Haircut services |
| Horario | horarios | Business hours |
| Admin | admins | Admin users |
| Reviews | reviews | Client reviews |
| Special | specials | Special day closures |

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
npm run admin        # create admin user (run once)
```

## Alpine.js Patterns Used

- Mobile menu toggle: `x-data="{ open: false }"` on nav wrapper
- Icon picker dropdown in servicios: `x-data="{ open: false }"` + `@click.away="open = false"`
- Active nav state set via inline JS reading Handlebars `{{tab}}` variable

## FullCalendar Notes

- Always use `themeSystem: 'standard'` — the `bootstrap` theme requires Bootstrap CSS which is removed
- `@fullcalendar/bootstrap5` script tag must NOT be included
- Calendar locale is set to Spanish (`locale: 'es'`)

## Booking Slot Business Rules

- All appointments and services last **30 minutes** (one slot).
- **Future-day bookings**: clients can only book on the hour (e.g. 9:00, 10:00). Internally stored as 30-min slots in the DB.
- **Same-day bookings (midnight window)**: starting at 12:00 AM of the current day and until end of day, the system also unlocks **half-hour slots** (e.g. 9:30, 10:30) for whatever times remain available. These are generated by `additionalHalfHourSlots()` in `reserva.js` and are only added when `date.isSame(moment(), 'day')`.
- **UI consequence**: the "Media hora" badge and the slot-type legend (`#time-legend`) must only appear when half-hour slots are actually present in the rendered grid. Never show "Hora completa" label — the user doesn't need to know this distinction. Only label half-hour slots to help the user identify them when they coexist with full-hour slots.
