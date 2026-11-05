# WANDERMIN

**Every Minute Takes You Somewhere.** · 매 순간, 새로운 세상으로. · 一分ごとに、新しい世界へ。

Focus timer that turns completed focus minutes into real-world travel distance (default 1 min = 50 km).

A Next.js (App Router) PWA-in-progress on top of a framework-independent core: travel data,
distance/journey engine, focus timer, postcard and boarding-pass renderers, and i18n.
Phase 1 (this build): responsive shell, timer with recovery, route planning, boarding passes,
arrival postcards, travel journal, settings. Guest mode only; data stays on the device.

## Commands

```bash
npm install
npm run dev             # http://localhost:3000
npm run build && npm start
npm run check           # tsc --noEmit + vitest
npm run postcard        # renders every city's postcard from real journey data into out/
npm run boarding-pass   # renders the Seoul → Tokyo boarding pass in its three states
npm run icons           # app icons from the pixel engine
npm run splash          # iOS launch screens (public/splash, sizes in src/config/splash.ts)
```

## Layout

```
src/
  config/travel.ts              game balance (kmPerMinute, guided suggestions)
  data/
    cities.json                 50 cities: id, names (en/ko/ja), ISO country, lat/lng, postmark code, departure flag, landmark
    countries.json              23 countries: names, capital, postcard label
    routes.json                 curated flight legs (distances computed, never stored)
    index.ts                    typed accessors
  lib/geo.ts                    haversine, great-circle interpolation, antimeridian-safe lines
  features/travel/
    graph.ts                    flight graph, shortest path, guided suggestions
    journey.ts                  derives position/arrivals from plan + session ledger (pure)
  features/postcards/
    pixel/canvas.ts             indexed pixel canvas → crisp SVG paths
    pixel/font.ts               original 5×7 and 3×5 bitmap fonts
    template.ts                 card layout, stamp, postmark, auto-fit captions
    scenes/<city>.ts            one illustration per city (all 50)
    scenes/common.ts            shared drawing helpers: sky, ridges, roofs, townhouses, people, boats, lanterns
    scenes/index.ts             scene registry
  features/tickets/
    boarding-pass.ts            one pass per flight leg: boarding → in-flight → arrived (stamped, stub torn)
  features/focus/timer.ts       timestamp-based timer state machine (no countdown variables)
  store/state.ts                app state + pure reducer (start/pause/resume/finish/cancel/reconcile)
  store/AppProvider.tsx         persistence (localStorage), cross-tab sync, reconcile on focus/visibility
  app/                          pages: / (home), /map (route), /focus, /journal, /profile
  components/                   Shell (bottom tabs / rail / sidebar), pickers, arrival sheet, pixel renderer
  i18n/
    react.tsx                   I18nProvider + useI18n (useSyncExternalStore: switches in place)
    config.ts                   locales, fallbacks, localized data helper
    messages/{en,ko,ja}.json    all UI strings
    index.ts                    store: t(), setLocale(), subscribe(), Intl formatting
tests/                          136 unit tests
```

## How to extend

**Add a city** — append to `src/data/cities.json` (and its country to `countries.json` if new), add at
least one leg in `routes.json`. Tests check coordinates, names in every locale, unique codes and
that every city is reachable from every departure.

**Add a postcard** — write `src/features/postcards/scenes/<city>.ts` exporting a `PostcardScene`
(draw into a 224×108 pixel canvas + a stamp motif) and register it in `scenes/index.ts`.
Title, country, dates, focus time, route and postmark come from data automatically.
Cities without a registered scene have no postcard yet; the app must not invent one.

**Add a language (e.g. zh-Hans)** — add `messages/zh-Hans.json` with the same keys, register it in
`messages/index.ts`, move it from `PLANNED_LOCALES` to `SUPPORTED_LOCALES`. Optional `zh-Hans`
names in data files; missing ones fall back through `FALLBACKS` (zh-Hant → zh-Hans → en).

## Design decisions

- Journey state is derived from an append-only session ledger; each session stores the km/min
  rate it was earned at, so changing the rate never rewrites past arrivals. Session ids are deduped.
- Plans may only use curated legs (no teleporting). Rerouting keeps visited cities and the leg in progress.
- Postcards are printed in English, like real souvenir cards, so the bitmap font stays Latin-only;
  the app UI around them (album, captions, share sheet) is fully localized.
- Language changes go through a subscribable store; React will read it with
  `useSyncExternalStore`, so the page updates in place without a reload.
- Fonts on the postcard are original bitmap glyphs: no font files, no licences, identical on every device.

## Boarding pass

One pass per flight leg, used twice. It is issued when the leg starts and fills its route bar as
sessions complete. On arrival it gets an ARRIVED stamp and the stub tears off along the perforation.
The stub's window shows the destination's postcard scene at half scale (`windowFocus` on a scene
picks the centre). Flight numbers and seats are stable per route, so the live, preview and stored pass always match.

## Phase 1 behaviour notes

- The timer never counts down a variable. On load, on `visibilitychange` and on `pageshow` it
  reconciles from the stored timestamps; a session that ended while the app was closed is
  recorded at its natural end time and the user is told so ("completed while you were away").
- Sessions under one minute and breaks are not recorded as travel. Cancelled sessions are kept
  in a separate list and never add distance. Completion is idempotent by session id, so two tabs
  finishing the same session record it once.
- Arrival is recorded when the session that crosses the line completes. If a short leg is fully
  flown mid-session, the pass says LANDING until then.
- Not in this build (next phases): server push, accounts/sync, achievements. Data persistence uses localStorage behind a single provider; moving to
  IndexedDB is a contained change.

## PWA and the lock screen

- `src/app/manifest.ts` + pixel-art icons (`npm run icons`) + iOS home-screen meta. Install
  guidance: the native prompt on Android/desktop Chromium, Share → Add to Home Screen on iOS.
- `public/sw.js`: precaches the five pages, every hashed asset they reference and the audio, so the
  first visit is already offline-ready. Pages are network-first, build assets cache-first, audio
  supports byte ranges from cache. Bump `VERSION` to roll caches.
- Lock screen (both opt-in, in Focus and Profile):
  - **Cabin sound**: a generated, seamless 64 s cabin hum (`public/audio`). While it plays the
    OS shows a Media Session card: "Flying to Tokyo", landing time, and a progress bar for the
    session; its play/pause buttons resume/pause the session. Its `timeupdate` events also let the
    page record the landing on time with the screen off, where the OS keeps media playing.
  - **Lock-screen notice**: a silent notification with the landing time, updated on pause and
    replaced by an arrival notice when the session lands while the page is alive.
- Honest limits: a web app cannot run code when the OS suspends it, and cannot schedule a local
  alert for later. Without cabin sound, the landing is recorded the moment the app is opened again.
  On iOS, notifications need the app installed to the home screen (iOS 16.4+).
- Browser checks (headless Chrome, simulated phone/tablet/desktop with a fake clock) are in
  the session report; real-device testing on iOS/Android is still to do.

## Usability pass (Nov 2026)

- **Fewer taps**: one-tap "Start 25 min" on Home (last duration and activity), a start button that
  stays above the tab bar on phones, lock-screen options folded into one line that shows what's on.
- **No native dialogs**: finish, cancel and erase use an in-app sheet; the safe choice is focused
  first and Escape/tap-outside choose it. Cancelling shows "Undo" for 8 s, and the cancelled
  seconds count as a pause, so no focus time is invented.
- **Feedback**: a break that runs out chimes, buzzes (Android) and offers "Start next flight";
  landing buzzes too. The browser tab shows `24:00 → Tokyo`. Space pauses/resumes on desktop.
- **Dark mode**: Match device / Light / Dark in Profile, applied before first paint (no flash).
- **Onboarding**: language buttons on the first screen and a three-step "how it works".
- **World map** (`/map`): Natural Earth 1:110m land baked into one SVG path (`npm run bake-land`,
  ~41 KB, no map library at runtime); flown legs solid, the rest dashed, the plane at its live
  position, "My route" / "Whole world" zoom, collision-aware labels.
- After landing at the last stop, the arrival sheet leads straight to choosing the next city.

## App-like upgrade (Nov 2026)

- **Art off the main thread**: postcards and passes render in a Web Worker
  (`src/features/art/art.worker.ts`) to PNG, cached in memory and in Cache Storage (`wm-art-v1`),
  and load lazily as images (`ArtImage`). Job types and cache keys live in `features/art/jobs.ts`
  so UI code never imports the scenes. Home first-load JS: 183 kB → 134 kB.
- **Native feel**: swipe-down bottom sheets (portalled to `<body>`) for every dialog, page
  transitions, a progress ring with the plane on the Focus timer, pressed states, light haptics on
  tab change, a skeleton shell while local data loads, safe-area padding, no overscroll bounce in
  the installed app, 16 px inputs so iOS never zooms.
- **Share**: postcards share as a PNG through the system share sheet (saved as a file where sharing
  files isn't supported). Tap any postcard in the journal to open it full size.
- **Installed app**: iOS launch screens for current iPhones and iPads, manifest shortcuts
  (Focus / Journal / Map), store screenshots, `launch_handler: focus-existing`, an icon badge with
  the number of unopened postcards, and a "new version ready · Reload" toast when the service worker
  updates (never reloads on its own mid-session).
- **Keeping data safe**: restore from a backup file in Profile (validated, asks before replacing;
  a running session is never imported). The home-screen install card now waits until the first
  finished session, and in Safari on iPhone explains that installing keeps the travel log safe.
- Lighthouse (mobile, local): performance 63 → 81–85, LCP 4.4 s → 1.5–1.8 s, CLS 0;
  accessibility, best practices and SEO 100.

## First run (Nov 2026)

Modelled on how focus and travel apps onboard (value first, one decision per screen, defaults
pre-selected, first session one tap away): a welcome screen with a sample postcard and three
lines on how it works → departure (pre-selected from the device time zone) → first destination
(shortest flight pre-selected, shown as minutes of focus) → the boarding pass with
"Board and focus", which starts the first session immediately. Progress dots, back, language
switch, no tab bar until the plan exists. Profile → "How WANDERMIN works" replays the intro.

## World expansion (Nov 2026): 30 → 50 cities

Twenty cities fill the empty parts of the map, each with a full postcard at the same detail level:
Busan, Jeju, Shanghai, Da Nang, Kuala Lumpur, Agra, Dubai · Lisbon, Athens, Reykjavík, Berlin ·
Marrakech, Nairobi, Zanzibar · Honolulu, Havana, Cusco, Rio de Janeiro, Buenos Aires · Auckland
(16 new countries). 53 new flight legs keep hops in Asia and Europe short (Seoul → Busan is 7 min)
and connect South America, East Africa, Iceland, Hawaii and New Zealand through hubs.
Onboarding shows the three nearest first flights plus "More direct flights" for the rest.
Shared scene helpers added: `leaf` (mottled canopy texture), `palm`, `windows`.
The baked coastline now unwraps rings that cross the antimeridian (no more lines across the map).

## Flight accounting fix (Nov 2026)

- **No banked distance.** Each planned stop records when it was added (`plan.addedAt`); a session can
  only fly legs that existed when it finished. Choosing a city later never spends old focus time on it,
  so picking a destination can no longer produce an arrival or a postcard by itself.
- **Sessions land with the plane.** A focus session is capped at the flight time left to the final
  planned stop (`flightLeftMs`), so the timer, the boarding pass and the distance always finish together.
  Start buttons say so ("Fly to Osaka · 16:35"); breaks are never capped.
- **Distance = route flown.** `journey.totalKm` no longer includes time past the final stop; total focus
  minutes still count every minute.
- Older saves (no `addedAt`) keep their previous history unchanged.

## Layouts for every screen

Tested at 17 viewports (320×568 up to 2560×1440, phones and tablets in both orientations):
- `sm` breakpoint is 560px, so every phone on its side gets the side rail instead of bottom tabs.
- Custom variants in `globals.css`: `wideland` (landscape with room for two columns), `short`
  (landscape ≤560px tall) and `tiny` (≤380px tall). Landscape puts the timer ring beside the boarding
  pass, the arrival sheet's pass beside the postcard, and the postcard viewer beside its details.
- Primary buttons stay pinned on short screens; labels never wrap; safe-area insets on notched phones.
- Very large monitors scale the rem-based UI (112.5% at ≥1920px, 125% at ≥2400px).

## Real-user simulation (Nov 2026)

Five personas plus a random "monkey" run (350 taps with time jumps, back presses and reloads) on
phone, landscape phone, tablet and desktop in ko/en/ja: a student closing the app mid-flight, a
keyboard-only desktop user on a multi-session long haul, a tablet user switching language mid-flight,
accidental actions (back button, 404, two tabs, offline, too-short sessions, reset, dark mode), and
settings edge cases (notifications denied, sound on, double taps, a 3-hour session). Fixed from it:
- The system back button now goes back an onboarding step and closes sheets, instead of leaving the
  app (`components/backStack.ts`); finishing onboarding removes its steps from history.
- Friendly, localized 404 page with a way home.
- Offline tab switches use cached page data (no failed requests); vibration waits for the first tap.
- The welcome postcard is a ready-made image (`npm run samples`), so it shows instantly.

What the app is, made obvious: link previews (title, description and a 1200×630 image,
`npm run og`), a "How it works" button on Home, one-line explanations on Focus before and during a
flight, and subtitles on the map and journal.

## Collection board and takeoff/landing moments (Nov 2026)

- **Postcard collection** (`components/CollectionBoard.tsx`): all 50 cities on the journal, with
  region tabs (Asia 1/17 …) and a progress bar. Visited cities show their postcard; the rest are faded
  sepia ghosts with how much focus they are from where you are. Tapping one explains the route
  (time, distance, stops) and "Fly here" plans it and opens Focus.
- **Takeoff** (`components/Takeoff.tsx`): a 2-second overlay when a flight starts — the pixel plane rolls
  down the runway and climbs out. Fresh starts only (not after reloads); a tap skips it.
- **Landing**: the boarding pass gets a stamp thump with an ink ring and pixel confetti, then the
  postcard slides in. All motion is off with Reduced motion.

## Passport, flight to-dos and the lock-screen flight card (Nov 2026)

- **Passport** (`components/Passport.tsx`): ink stamps in SVG (shape, colour and tilt from the country
  code; a turbulence filter gives the inked edge). The first flight stamps the home country as
  DEPARTURE; each new country reached adds an ARRIVAL stamp, also shown on the arrival sheet.
- **To-do for each flight**: an optional note when starting (kept on the session), shown while flying;
  after landing, "Did you get it done?" → done, or carry it over to the next flight (pre-filled).
  The journal's session list shows ✓ / ↻ with the note.
- **Lock-screen flight card** (`components/lockArt.ts`): with cabin sound on, the Media Session artwork is
  a 1024×1024 picture of the destination scene, route codes, progress with the plane and the landing time,
  redrawn every minute (and on audio ticks while the screen is off). iOS 16+ can enlarge it on the lock
  screen; Android uses it as the player background. A full custom lock-screen UI needs a native app.

## Window view and a calmer Home (Nov 2026)

- **Window view** (`components/WindowView.tsx`): inside the progress ring, a round plane window with the
  wing. The sky follows the traveller's local time (dawn, day, dusk, night with stars and the moon);
  flat pixel clouds drift slowly in three layers and stop when paused; for the last fifth of a leg the
  destination's skyline fades in below. Timer sits under the window. Profile → "View from the window"
  switches back to the classic ring; Reduced motion keeps it still.
- **Home**: the flight card leads with the live boarding pass; new travellers see only the flight and
  their first-postcard goal (no empty stats); stats become one compact row; recent postcards are a
  swipeable row with "See all".
- **Fixes found while building it**: a hop shorter than a minute (Osaka → Kyoto, 43 km) could never land,
  because the session was shortened below the 1-minute recording minimum — flight-length sessions now
  run at least a minute. Boarding passes now follow the same no-banking rule as the journey, so a new
  leg never starts at "2%".

## Deploy to Vercel

The app is a standard Next.js project: Vercel detects it with no settings to change
(framework Next.js, build `next build`, Node ≥ 20). Security and caching headers live in
`next.config.mjs`, so they apply on any host. Nothing needs environment variables.

**Option A — GitHub + Vercel (recommended, redeploys on every push)**
1. Create an empty GitHub repository (no README), then from this folder:
   `git remote add origin https://github.com/<you>/wandermin.git && git push -u origin main`
2. vercel.com → Add New… → Project → Import that repository → Deploy.

**Option B — Vercel CLI from your computer**
`npx vercel` (first time: log in and accept the defaults), then `npx vercel --prod`.

After deploying, open the HTTPS URL on your phone:
- iPhone: Safari → Share → Add to Home Screen, open it from the home screen, then allow
  notifications from Focus → "Know it's running without unlocking".
- Android: Chrome shows an install prompt (or ⋮ → Install app).

Things to check on real devices: the lock-screen media card with cabin sound on, landing on time
with the screen off, the lock-screen notice, offline reopen, and haptics on Android.
