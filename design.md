# HighQuality Studio — Design System

## Brand Identity

Premium barbershop. Masculine, dark, gold-accented. Communicates quality, precision, and confidence.


---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-gold` | `#F4C82C` | Primary accent — CTAs, selections, highlights, numbers |
| `--color-dark-base` | `#141414` | Page background (primary) |
| `--color-fore` | `#0d0d0d` | Alternating section background (darker) |
| `--color-light-base` | `#f1f1f1` | Primary text, light section backgrounds |
| `--color-secondary` | `#f8272e` | Red accent — nav active states, danger |
| `--color-primary` | `#1D4ED8` | Navy blue — informational, link active, admin CTAs. Chosen 2026-09-26 to replace the old violet `#7c3aed`: reads as professional/high-end and echoes the classic barber-pole red/white/blue without competing with the red danger accent. |
| `--color-info` | `#3086e7` | Info state, time slot color (lightskin half-hour slots) |
| `--color-lightskin` | `#ffe1b3` | Half-hour time slot color |
| `--color-maps` | `#e44e4e` | Map/location icon, clock icon |
| `--color-success` | `#14b73a` | Success states |
| `--color-danger` | `#e74c3c` | Error states |
| `--color-muted` | `#6f6f6f` | Muted text |

### Alternating section pattern
Dark pages alternate between `#141414` and `#0d0d0d` — never two identical shades back-to-back.

---

## Typography

| Role | Font | Class | Usage |
|------|------|-------|-------|
| Display / Hero | Bebas Neue | `.bebas` | Section headings, large numbers, step headings |
| Decorative / Script | The Nautigal | `.nautigal` | Section subtitle labels ("Lo que ofrecemos", "Sobre nosotros") |
| Body | Inter | (default) | All body text, UI labels, form fields |

### Size ramp
- Display: `clamp(4.5rem, 15vw, 11rem)` (hero h1)
- Section heading: `clamp(2.5rem, 6vw, 4.5rem)` or `clamp(3rem, 7vw, 5.5rem)`
- Sub-label (nautigal): `2rem`
- Body: `0.875rem` – `1rem`
- Small / caption: `0.7rem` – `0.8rem`

### Pattern: section label + heading
Every major section uses:
```
<p class="nautigal text-gold">Decorative label</p>
<h2 class="bebas ...">MAIN HEADING</h2>
```

---

## Spacing

- Section vertical padding: `py-24` (6rem top + 6rem bottom)
- Container max-width: `max-w-6xl` (72rem) for most sections
- Focused/card container: `max-w-lg` (32rem) — booking flow, review form
- Internal card padding: `1.5rem` – `2.5rem`
- Gap between cards: `1.25rem` – `1.5rem`

---

## Components

### Buttons
```html
<!-- Primary CTA -->
<a class="btn btn-gold btn-lg rounded-pill">
  <i class="fa-solid fa-scissors me-2"></i>Reservar Cita
</a>

<!-- Secondary -->
<a class="btn btn-outline-light btn-lg rounded-pill">Ver más</a>

<!-- Danger / Admin -->
<button class="btn btn-danger btn-sm">Eliminar</button>
```

Sizes: `.btn-sm` / `.btn` (default) / `.btn-lg`  
Always use `.rounded-pill` for external-facing buttons. Square corners for admin table actions.

### Cards (dark)
```html
<div class="rounded-2xl border border-white/10" style="background-color:#141414;">
  ...
</div>
```

Standard card: `rgba(255,255,255,0.03)` background + `rgba(255,255,255,0.08)` border + `border-radius: 1rem` – `1.5rem`.

### Selection cards (booking, servicios)
Selected state: `border-color: #F4C82C` + `background: rgba(244,200,44,0.07)` + gold checkmark badge.

### Dividers
```html
<div class="mostache-hr hr-light my-5">
  <div class="mostache-hr-inner"></div>
  <img src="/images/icons/mostacho.png" alt="moustache">
  <div class="mostache-hr-inner"></div>
</div>
```
Use `hr-light` on dark backgrounds, `hr-black` on light backgrounds.

---

## Animation System

### Scroll entrance (AOS)
All major sections use AOS. Init: `AOS.init({ once: true, duration: 820, offset: 60 })`.

Patterns used:
- `data-aos="fade-up"` — cards, headings entering from below
- `data-aos="fade-right"` — left-side content
- `data-aos="fade-left"` — right-side content
- `data-aos-delay="0|80|160|240"` — staggered children (80ms apart)

### Hero entrance (CSS keyframes)
```css
/* Elements animate in sequence via animation-delay */
.hero-tagline  { animation: heroUp 0.8s ease 0.1s both; }
.hero-title    { animation: heroUp 1.0s ease 0s both; }
.hero-desc     { animation: heroUp 0.8s ease 0.3s both; }
.hero-buttons  { animation: heroUp 0.8s ease 0.5s both; }

@keyframes heroUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Step transition (booking flow)
Slide in from right when going forward, slide in from left when going back:
```css
.booking-step.slide-fwd  { animation: bkSlideRight 0.38s cubic-bezier(0.25,1,0.5,1) both; }
.booking-step.slide-back { animation: bkSlideLeft  0.38s cubic-bezier(0.25,1,0.5,1) both; }
```

### Time slot entrance
Each slot: `animate__zoomIn animate__faster` with `animation-delay: i * 30ms`.

### Hover effects
- Cards: `transform: translateY(-4px)` + border highlight
- Gallery images: `transform: scale(1.06)`
- Service cards: `brightness` change on image
- Buttons: background darken

### Floating decoration
`@keyframes floatBrocha` — gentle float on the brocha image in the About section.

### Scroll indicator (hero)
`@keyframes scrollBounce` — dot bounces inside a pill border.

---

## Booking Flow (Multi-step)

4 steps, slide transitions, single-column layout centered at `max-width: 540px`.

| Step | Content | Validation |
|------|---------|------------|
| 1 — Servicio | Service cards (multi-select), price total bar | ≥1 service selected |
| 2 — Día | Custom month calendar (Monday-first, closed days dimmed) | Date selected |
| 3 — Hora | Time chips (gold = full hour, lightskin = half hour) | Hour selected |
| 4 — Datos | Booking summary card + name + phone | Both fields filled |

Calendar day states: `.disabled` (past / closed day) · `.today` (gold dot indicator) · `.selected` (gold fill).

---

## Icons

- **FontAwesome Free** — `/fonts/icons/free/css/all.css`
- **FontAwesome Pro** — `/fonts/icons/pro/css/all.css` (needed for `fa-duotone` in admin calendar)
- **Service icons** — PNG files at `/images/icons/{filename}.png` stored in service `icon` field

---

## Layout Principles

1. **Light section** (`#f1f1f1` bg) — used only for About. Black text, no gold text. One per page max.
2. **Sections alternate** between `#141414` and `#0d0d0d`.
3. **Full-bleed backgrounds** — hero sections use `background-attachment: fixed` on desktop, `scroll` on mobile.
4. **Mobile-first** — fluid `clamp()` type sizes, grid collapses to 1-2 cols on mobile.
5. **No Bootstrap CSS or JS** — compat layer in `input.css` handles Bootstrap class names generated by JS.
6. **Alpine.js** for reactive UI — mobile menus, icon dropdowns. Keep x-data scope tight.
7. **AOS once: true** — animations play once on scroll, never replay.

---

## Admin Dashboard Design System

### Principles
- **Pure Tailwind** — no inline `style=""` for visual styling in HBS templates; only `style="display:none;"` for JS-toggled visibility
- **Mobile-first** — single column on mobile, expands on `sm:` / `lg:`
- **Consistent dark theme** — `#141414` body, `#0d0d0d` cards, `border-white/8` borders

### Admin Page Shell
```html
<div class="max-w-screen-xl mx-auto px-4 sm:px-6 py-4">
```

### Standard Page Header Card
```html
<div class="bg-[#0d0d0d] border border-white/8 rounded-xl p-4 mb-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
            <h1 class="text-xl font-bold mb-1 flex items-center gap-2">
                <i class="fa-solid fa-icon text-primary"></i> Title
            </h1>
            <p class="text-gray-500 text-sm mb-0">Description</p>
        </div>
        <button class="btn btn-primary">Action</button>
    </div>
</div>
```

### KPI Card (legacy — flat, superseded below)
```html
<div class="rounded-xl p-4 border-l-4 border-primary/60 bg-primary/8">
    <p class="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
        <i class="fa-solid fa-icon text-primary"></i> Label
    </p>
    <h2 class="text-2xl font-bold text-primary" id="kpiId">0</h2>
</div>
```

### KPI Gradient Card (current standard, since 2026-09-26)
Every stat/KPI tile gets a soft diagonal gradient tint + a gradient icon badge, its own hue, and a colored `border/25`. This is for the top 4 stat tiles only — the "Ahora / Próxima" status card intentionally stays flat (`bg-white/[.03]`, no gradient): user explicitly rejected a gradient version of it (2026-09-26), keep it plain.

```html
<div class="kpi-card kpi-hideable rounded-lg p-2.5 bg-gradient-to-br from-{hue}-500/20 via-{hue2}-500/10 to-transparent border border-{hue}-400/25 flex items-center gap-2">
    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-{hue}-400 to-{hue2}-600 flex items-center justify-center shrink-0 shadow-lg shadow-{hue}-500/20">
        <i class="fa-solid fa-icon text-white text-xs"></i>
    </div>
    <div class="min-w-0">
        <p class="text-[10px] text-{hue}-300/70 leading-none mb-1 truncate">Label</p>
        <h2 class="text-base font-bold text-{hue}-200 leading-none" id="kpiId">0</h2>
    </div>
</div>
```

Hue assignment used on the admin panel (`admin/index.hbs`) — never reuse a hue for two adjacent cards:
| Stat | Hue |
|------|-----|
| Citas hoy | violet/purple |
| Por Pagar | danger/orange (red→orange gradient) |
| Ganancias hoy | emerald/green |
| Ganancias (mes, chart trigger) | primary/blue |

Calendar view-switcher buttons (`.cal-view-btn.active` in `input.css`) and FullCalendar's own prev/next (`.fc-button-primary`) use the same idea as a solid diagonal gradient instead of a flat `bg-primary`: `linear-gradient(135deg, #2563eb, #1d4ed8 55%, #1e3a8a)` with a soft `box-shadow: 0 4px 14px rgba(29,78,216,.35)`. Buttons are sized `px-4 py-2.5 text-sm` (up from the old `px-3 py-1.5 text-xs`) — calendar controls should read as bigger/tappable, not compact chrome.

### Admin Color Usage
| Purpose | Tailwind |
|---------|---------|
| Card surface | `bg-[#0d0d0d]` |
| Card border | `border border-white/8` |
| Primary accent | `text-primary` / `bg-primary/8` / `border-primary` |
| Gold accent (active nav, stars) | `text-gold` / `bg-gold/10` |
| Danger | `text-danger` / `bg-danger/8` |
| Success | `text-success` / `bg-success/5` |
| Muted label | `text-gray-500 text-xs` |

### Nav Active State
- Desktop: JS removes `text-gray-400`, adds `text-yellow-400 bg-yellow-400/10`
- Mobile: JS inline style `color:#fff; background:rgba(48,4,243,0.15); border-left:3px solid #3004f3`
- Controlled by `{{tab}}` variable from each admin route

### Bottom Sheet (admin modals, standard since 2026-09-26)

Admin dialogs are **Alpine bottom sheets**, never Bootstrap modals. Two live in `admin/index.hbs`:
`#citaDetailModal` (`citaDetailData()`) and `#nuevaCitaSheet` (`nuevaCitaData()`).

Recipe:
- Backdrop: `fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4`,
  `background:rgba(0,0,0,0.75); backdrop-filter:blur(6px)`, closes on backdrop click + `Escape`.
- Panel: `w-full sm:max-w-md bg-[#0d0d0d] border border-white/10 rounded-t-3xl sm:rounded-2xl`
  — slides up from the bottom on mobile, centers as a card on `sm:`.
- Transitions: backdrop `opacity` 200/150ms; panel `translate-y-full → translate-y-0` 300/200ms.
- Drag handle (`sm:hidden`): `w-10 h-1.5 rounded-full bg-white/20`, touch drag > 90px closes.
- Sub-views switch with `x-show` + `opacity-0 translate-x-4 → opacity-100 translate-x-0` (200ms).
- Opened by dispatching a window event (`open-cita-detail`, `open-nueva-cita`) from `index.js`,
  so calendar/JS code never touches the sheet's DOM.
- Structure for multi-step sheets: fixed header (title + context + step bar) · scrollable body
  (`flex-1 overflow-y-auto min-h-0`) · sticky footer with the primary action
  (`padding-bottom: calc(1rem + env(safe-area-inset-bottom))`).

**Nueva Cita flow** (`#nuevaCitaSheet`): 3 steps — Cliente (search + inline "nuevo cliente" view) ·
Hora (chips: gold = hora completa, `info` teal = media hora, clicked calendar slot preselected) ·
Servicios (cards + live total with the Corte+Barba / Cejas discounts). "Marcar día como cerrado"
is a fourth view inside the same sheet.
