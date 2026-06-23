import { cpSync, mkdirSync, writeFileSync, existsSync, rmSync } from "fs";
import { join } from "path";

const vercelOut = ".vercel/output";

// Clean previous output
if (existsSync(vercelOut)) {
  rmSync(vercelOut, { recursive: true });
}

console.log("📦 Building Vercel Build Output API v3 structure...");

// ── 1. Static assets ──────────────────────────────────────────────────────────
mkdirSync(join(vercelOut, "static"), { recursive: true });
if (existsSync("dist/client")) {
  cpSync("dist/client", join(vercelOut, "static"), { recursive: true });
  console.log("✅ dist/client  →  .vercel/output/static");
}

// ── 2. Serverless function (Node.js) ─────────────────────────────────────────
// The TanStack Start server exports: export default { fetch(req, env, ctx) {} }
// Vercel Node.js functions use (req, res) — we wrap it via @vercel/node bridge.
// BUT we can use Edge runtime which natively supports the Fetch API.
const funcDir = join(vercelOut, "functions/index.func");
mkdirSync(funcDir, { recursive: true });

// Copy server build into function
cpSync("dist/server", join(funcDir, "server"), { recursive: true });

// Entry shim — re-exports the fetch handler for Vercel Edge
writeFileSync(
  join(funcDir, "index.js"),
  `export { default } from './server/server.js';`
);

// Vercel Edge function config
writeFileSync(
  join(funcDir, ".vc-config.json"),
  JSON.stringify({ runtime: "edge", entrypoint: "index.js" }, null, 2)
);

console.log("✅ dist/server  →  .vercel/output/functions/index.func  (edge)");

// ── 3. Vercel routing config ──────────────────────────────────────────────────
const config = {
  version: 3,
  routes: [
    // Static assets served directly from .vercel/output/static
    { handle: "filesystem" },
    // Everything else proxied to the Edge SSR function
    { src: "/(.*)", dest: "/index" },
  ],
};

writeFileSync(join(vercelOut, "config.json"), JSON.stringify(config, null, 2));
console.log("✅ config.json created");

console.log("\n🎉 .vercel/output ready for deployment!");
