import { execSync } from "node:child_process";

/**
 * The build this deployment is: the commit (Vercel provides it; locally from git) and when it was built.
 * Shown in Settings, served at /version.json, and used to name the service worker's caches, so every
 * deployment is recognised as a new version.
 */
function gitShort() { try { return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } }
const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || gitShort() || Date.now().toString(36);
const BUILT_AT = new Date().toISOString();

/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID, NEXT_PUBLIC_BUILT_AT: BUILT_AT },
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // the service worker must always be re-checked, or users get stuck on an old version
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
      // the version check must always reach the server
      { source: "/version.json", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
      { source: "/audio/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/icons/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
};

export default nextConfig;
