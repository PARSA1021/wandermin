# Browser test suites

Real-browser checks (Playwright for Python) that walk through WANDERMIN the way people use it.
They run against a production build on port 3100:

```
npm run build && npx next start -p 3100
pip install playwright && python -m playwright install chromium
cd e2e && python e2e_app.py out
```

Each script takes an output folder for screenshots and prints `PASS`/`FAIL` lines and a total.
Set `WM_CHROME=/path/to/google-chrome` to use Google Chrome (needed for the AAC cabin-sound checks).

| Script | What it covers |
|---|---|
| `e2e.py` | First visit, onboarding, a full flight, reload/pause, arrival, journal, language switch |
| `e2e_ux.py` | Sheets and confirmations, cancel + undo, dark mode, back button, no native dialogs |
| `e2e_pwa.py` | Service worker, offline shell, lock-screen options, install metadata |
| `e2e_app.py` | Notes/to-dos, backups, collection, passport stamps, lock-screen card, shortest hop |
| `reset_bug.py` | Erasing the travel record never leaves the user stuck |
| `sim.py` | Personas (student, keyboard user, tablet, edge cases, settings) and a random "monkey" |
| `resp.py` | Every screen at phone, tablet and desktop sizes: overflow, clipped text, tap targets |
| `find.py` | Can a new user find postcards, settings, search and "change destination" |
| `nx.py` | Arrival → next country in one tap, local times |
| `audit.py` | Corrupted/blocked storage, bad input, backups, offline, two tabs, clock changes, keyboard |
| `a11y.py` | axe-core WCAG 2 A/AA scan of every screen in light and dark (`npm i --no-save axe-core`) |
| `update.py` | Builds two versions and checks the open app notices, updates mid-flight and says so |
| `perf.py` / `power.py` | Frame smoothness under CPU throttling; redraws per 10 s while flying |
