/* WANDERMIN service worker — offline app shell, cached art/audio, notification clicks.
 * The timer never runs here: progress is always computed from stored timestamps by the page. */
const VERSION = "wm-v4";
const SHELL = ["/", "/focus", "/map", "/journal", "/profile", "/manifest.webmanifest",
  "/icons/icon-192.png", "/icons/icon-512.png", "/samples/welcome-tokyo.png", "/audio/chime.m4a", "/audio/chime.mp3"];
const MEDIA = ["/audio/cabin.m4a", "/audio/cabin.mp3"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    // precache every hashed script/style the shell pages reference, so the very first visit works offline
    const assets = new Set();
    for (const page of ["/", "/focus", "/map", "/journal", "/profile"]) {
      const res = await cache.match(page);
      const html = res ? await res.text() : "";
      for (const m of html.matchAll(/\/_next\/static\/[^"'\s)]+/g)) assets.add(m[0].replace(/\\u0026/g, "&"));
    }
    await Promise.all([...assets].map((u) => cache.add(u).catch(() => {})));
    // the data each page needs for in-app navigation, so switching tabs offline is seamless
    await Promise.all(["/", "/focus", "/map", "/journal", "/profile"].map(async (page) => {
      try { const res = await fetch(page, { headers: { RSC: "1" } }); if (res.ok) await cache.put(rscKey(page), res); } catch { /* optional */ }
    }));
    // the cabin loop is optional; cache it without blocking install
    cache.addAll(MEDIA).catch(() => {});
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION && !key.startsWith("wm-art-")) await caches.delete(key);
    await self.clients.claim();
  })());
});

/** In-app navigations fetch the page's data with a changing ?_rsc= token; cache it by path instead. */
const rscKey = (path) => `${path}?__rsc`;
const isRsc = (req, url) => url.searchParams.has("_rsc") || req.headers.get("RSC") === "1";

/** Serve a byte range from a cached full response, so <audio> works offline. */
async function rangeFromCache(request) {
  const cached = await caches.match(request.url);
  if (!cached) return fetch(request);
  const buf = await cached.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(request.headers.get("range") || "");
  const start = m && m[1] ? Number(m[1]) : 0;
  const end = m && m[2] ? Math.min(Number(m[2]), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "audio/mp4",
      "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/audio/") && req.headers.has("range")) {
    event.respondWith(rangeFromCache(req));
    return;
  }

  // pages: network first (fresh build), cached copy when offline
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(url.pathname, fresh.clone());
        return fresh;
      } catch {
        return (await cache.match(url.pathname)) || (await cache.match("/")) || Response.error();
      }
    })());
    return;
  }

  // page data for in-app navigation: network first, cached copy (by path) when offline
  if (isRsc(req, url)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(rscKey(url.pathname), fresh.clone());
        return fresh;
      } catch {
        return (await cache.match(rscKey(url.pathname))) || Response.error();
      }
    })());
    return;
  }

  // hashed build assets never change: cache first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // everything else (icons, audio, page data): stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req);
    const network = fetch(req).then((res) => { if (res.ok && res.status === 200) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || network;
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = all.find((c) => new URL(c.url).origin === self.location.origin);
    if (existing) { await existing.focus(); existing.navigate?.("/focus"); return; }
    await self.clients.openWindow("/focus");
  })());
});
