# Graph Report - .  (2026-06-20)

## Corpus Check
- Large corpus: 14891 files � ~4,806,816 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 370 nodes · 473 edges · 23 communities (21 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 950 input · 780 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin Auth Controller|Admin Auth Controller]]
- [[_COMMUNITY_Admin Dashboard UI|Admin Dashboard UI]]
- [[_COMMUNITY_Event Booking Controller|Event Booking Controller]]
- [[_COMMUNITY_Client Booking UI|Client Booking UI]]
- [[_COMMUNITY_Schedule Controller|Schedule Controller]]
- [[_COMMUNITY_Review Controller|Review Controller]]
- [[_COMMUNITY_Event Data Model|Event Data Model]]
- [[_COMMUNITY_Server Infrastructure|Server Infrastructure]]
- [[_COMMUNITY_Special Days Controller|Special Days Controller]]
- [[_COMMUNITY_Services Controller|Services Controller]]
- [[_COMMUNITY_Client Data Model|Client Data Model]]
- [[_COMMUNITY_Admin Auth Model|Admin Auth Model]]
- [[_COMMUNITY_Services Admin UI|Services Admin UI]]
- [[_COMMUNITY_Schedule Admin UI|Schedule Admin UI]]
- [[_COMMUNITY_Reviews Admin UI|Reviews Admin UI]]
- [[_COMMUNITY_Asset Licensing|Asset Licensing]]
- [[_COMMUNITY_Admin Seed Script|Admin Seed Script]]
- [[_COMMUNITY_Clients Admin UI|Clients Admin UI]]
- [[_COMMUNITY_Client Homepage UI|Client Homepage UI]]
- [[_COMMUNITY_Template Engine|Template Engine]]
- [[_COMMUNITY_Static Routes|Static Routes]]
- [[_COMMUNITY_Database Connection|Database Connection]]
- [[_COMMUNITY_Page Render Routes|Page Render Routes]]

## God Nodes (most connected - your core abstractions)
1. `init()` - 7 edges
2. `addClient()` - 6 edges
3. `init()` - 6 edges
4. `loadTimeSlots()` - 6 edges
5. `Font Awesome Free License` - 6 edges
6. `createClient()` - 5 edges
7. `moment` - 5 edges
8. `bringData()` - 5 edges
9. `updatePriceDisplay()` - 5 edges
10. `onNextClick()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Font Awesome Free License` --semantically_similar_to--> `Font Awesome Pro License`  [INFERRED] [semantically similar]
  public/fonts/icons/free/LICENSE.txt → public/fonts/icons/pro/LICENSE.txt
- `Font Awesome Pro Commercial License` --conceptually_related_to--> `Font Awesome Attribution Requirement`  [INFERRED]
  public/fonts/icons/pro/LICENSE.txt → public/fonts/icons/free/LICENSE.txt
- `auth()` --calls--> `sign()`  [EXTRACTED]
  src/backend/controllers/admin.controller.js → src/backend/helpers/cipher.js
- `create()` --calls--> `addClient()`  [EXTRACTED]
  src/backend/controllers/event.controller.js → src/backend/helpers/addClient.js
- `createClient()` --calls--> `addClient()`  [EXTRACTED]
  src/backend/controllers/event.controller.js → src/backend/helpers/addClient.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Font Awesome Free Triple License Scheme (CC BY 4.0 + SIL OFL 1.1 + MIT)** — free_license_cc_by_40, free_license_sil_ofl_11, free_license_mit [EXTRACTED 1.00]
- **Brand Icon Trademark Policy Applies to Both Free and Pro** — free_license_brand_icons_trademark, pro_license_brand_icons_trademark, free_license_fontawesome_free [INFERRED 0.85]

## Communities (23 total, 2 thin omitted)

### Community 0 - "Admin Auth Controller"
Cohesion: 0.06
Nodes (29): Admin, auth(), { sign }, Client, { sign }, encryptMD5(), jwt, sign() (+21 more)

### Community 1 - "Admin Dashboard UI"
Cohesion: 0.08
Nodes (23): addHalfHourtoMap(), addNextAppointmentToNavbar(), agendarCita(), analytics(), bringServices(), checkCitaData(), createCalendar(), createChart() (+15 more)

### Community 2 - "Event Booking Controller"
Cohesion: 0.09
Nodes (25): { addClient, addOneCitaPaga }, create(), createClient(), { createEvents }, Event, get(), getIcs(), moment (+17 more)

### Community 3 - "Client Booking UI"
Cohesion: 0.13
Nodes (27): additionalHalfHourSlots(), agendarCita(), AVOID_HOURS, bringServices(), calcTotal(), DAYS_MAP_ES_EN, goToStep(), init() (+19 more)

### Community 4 - "Schedule Controller"
Cohesion: 0.07
Nodes (13): Horario, Horario, Horario, HorarioSchema, moment, mongoose, mongoose, Services (+5 more)

### Community 5 - "Review Controller"
Cohesion: 0.10
Nodes (8): Review, create(), moment, Review, moment, mongoose, Review, ReviewSchema

### Community 6 - "Event Data Model"
Cohesion: 0.12
Nodes (14): create(), Event, get(), getMonth(), moment, update(), Event, EventSchema (+6 more)

### Community 7 - "Server Infrastructure"
Cohesion: 0.13
Nodes (14): { app, server }, cert(), fs, app, bodyParser, {cert}, express, hbs (+6 more)

### Community 8 - "Special Days Controller"
Cohesion: 0.12
Nodes (9): Special, create(), get(), moment, Special, moment, mongoose, Special (+1 more)

### Community 9 - "Services Controller"
Cohesion: 0.13
Nodes (4): fs, path, Services, Services

### Community 10 - "Client Data Model"
Cohesion: 0.16
Nodes (9): addOneCitaPaga(), Client, create(), findOne(), moment, Client, ClientSchema, moment (+1 more)

### Community 11 - "Admin Auth Model"
Cohesion: 0.18
Nodes (8): Admin, create(), moment, update(), Admin, AdminSchema, moment, mongoose

### Community 12 - "Services Admin UI"
Cohesion: 0.24
Nodes (10): actualizarServicio(), actualizarServicioOpenModal(), agregarServicio(), bringData(), buildFaIconGrid(), FA_ICONS, fillData(), init() (+2 more)

### Community 13 - "Schedule Admin UI"
Cohesion: 0.29
Nodes (5): actualizarHorario(), bringData(), cambiarestado(), fillData(), init()

### Community 14 - "Reviews Admin UI"
Cohesion: 0.28
Nodes (3): bringData(), fillData(), init()

### Community 15 - "Asset Licensing"
Cohesion: 0.36
Nodes (9): Font Awesome Attribution Requirement, Brand Icons Trademark Policy (Free), CC BY 4.0 License, Font Awesome Free License, MIT License, SIL OFL 1.1 License, Brand Icons Trademark Policy (Pro), Font Awesome Pro Commercial License (+1 more)

### Community 16 - "Admin Seed Script"
Cohesion: 0.29
Nodes (5): Admin, AdminSchema, CREDENTIALS, CryptoJS, mongoose

### Community 17 - "Clients Admin UI"
Cohesion: 0.53
Nodes (4): analytics(), createDataTables(), fillData(), init()

### Community 18 - "Client Homepage UI"
Cohesion: 0.53
Nodes (4): animateElements(), bringOpiniones(), checkForm(), init()

### Community 19 - "Template Engine"
Cohesion: 0.50
Nodes (4): exphbs, helpers(), instance(), path

### Community 20 - "Static Routes"
Cohesion: 0.50
Nodes (3): express, path, router

## Knowledge Gaps
- **114 isolated node(s):** `mongoose`, `{ app, server }`, `Admin`, `{ sign }`, `Client` (+109 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `migrate()` connect `Event Booking Controller` to `Admin Auth Controller`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `mongoose`, `{ app, server }`, `Admin` to the rest of the system?**
  _114 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Auth Controller` be split into smaller, more focused modules?**
  _Cohesion score 0.05507246376811594 - nodes in this community are weakly interconnected._
- **Should `Admin Dashboard UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07557354925775979 - nodes in this community are weakly interconnected._
- **Should `Event Booking Controller` be split into smaller, more focused modules?**
  _Cohesion score 0.08912655971479501 - nodes in this community are weakly interconnected._
- **Should `Client Booking UI` be split into smaller, more focused modules?**
  _Cohesion score 0.12873563218390804 - nodes in this community are weakly interconnected._
- **Should `Schedule Controller` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._