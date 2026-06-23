import { cpSync, mkdirSync, writeFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const vercelOut = ".vercel/output";

// ── 0. Run vite build first ────────────────────────────────────────────────────
console.log("🔨 Running vite build...");
execSync("npm run build", { stdio: "inherit" });
console.log("✅ Vite build complete");

// Clean previous .vercel/output
if (existsSync(vercelOut)) {
  rmSync(vercelOut, { recursive: true });
}

console.log("\n📦 Building Vercel Build Output API v3 structure...");

// ── 1. Static assets ──────────────────────────────────────────────────────────
mkdirSync(join(vercelOut, "static"), { recursive: true });
if (existsSync("dist/client")) {
  cpSync("dist/client", join(vercelOut, "static"), { recursive: true });
  console.log("✅ dist/client  →  .vercel/output/static");
}

// ── 2. Edge function ──────────────────────────────────────────────────────────
// TanStack Start server exports: { fetch(request, env, ctx) }
// Vercel Edge Runtime natively supports the Web Fetch API - perfect match!
const funcDir = join(vercelOut, "functions/index.func");
mkdirSync(funcDir, { recursive: true });

// Copy entire server build into function directory
cpSync("dist/server", join(funcDir, "server"), { recursive: true });

// Entry shim re-exports the Fetch API handler for Vercel Edge
writeFileSync(
  join(funcDir, "index.js"),
  `export { default } from './server/server.js';\n`
);

// Vercel Edge function metadata
writeFileSync(
  join(funcDir, ".vc-config.json"),
  JSON.stringify({ runtime: "edge", entrypoint: "index.js" }, null, 2)
);

console.log("✅ dist/server  →  .vercel/output/functions/index.func  (edge runtime)");

// ── 3. Routing config ─────────────────────────────────────────────────────────
const config = {
  version: 3,
  routes: [
    // Serve static client assets from .vercel/output/static directly
    { handle: "filesystem" },
    // All other requests → Edge SSR function
    { src: "/(.*)", dest: "/index" },
  ],
};

writeFileSync(join(vercelOut, "config.json"), JSON.stringify(config, null, 2));
console.log("✅ config.json created");

console.log("\n🎉 .vercel/output ready for Vercel deployment!");
