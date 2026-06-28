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

// ── 2. Serverless function (Node.js) ────────────────────────────────────────────────
// TanStack Start server exports: { fetch(request, env, ctx) }
// We wrap it in a Node.js req/res bridge to run on Vercel Serverless (nodejs20.x)
const funcDir = join(vercelOut, "functions/index.func");
mkdirSync(funcDir, { recursive: true });

// Copy entire server build into function directory
cpSync("dist/server", join(funcDir, "server"), { recursive: true });

// Entry shim translates Node.js req/res to Web API Request/Response
writeFileSync(
  join(funcDir, "index.js"),
  `import { Readable } from "node:stream";
import server from "./server/server.js";

export default async function handler(req, res) {
  try {
    const host = req.headers.host || "localhost";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const url = \`\${protocol}://\${host}\${req.url}\`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          for (const val of value) {
            headers.append(key, val);
          }
        } else {
          headers.set(key, value);
        }
      }
    }

    const hasBody = !["GET", "HEAD"].includes(req.method || "GET");
    const webRequest = new Request(url, {
      method: req.method,
      headers: headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? "half" : undefined,
    });

    const webResponse = await server.fetch(webRequest);

    res.statusCode = webResponse.status;
    res.statusMessage = webResponse.statusText;
    webResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (webResponse.body) {
      Readable.fromWeb(webResponse.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error("SSR Function Error:", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}`
);

// Vercel Serverless function metadata
writeFileSync(
  join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.js",
    },
    null,
    2
  )
);

console.log("✅ dist/server  →  .vercel/output/functions/index.func  (nodejs20.x serverless runtime)");

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
