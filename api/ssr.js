// Vercel Serverless Function — SSR catch-all for TanStack Start
// Uses dynamic import so dist/server/** is loaded at runtime (not bundled)
export default async function handler(req) {
  const { default: server } = await import("../dist/server/server.js");

  const host = req.headers.get("host") || "localhost";
  const protocol = host.includes("localhost") ? "http" : "https";
  const url = new URL(req.url, `${protocol}://${host}`);

  const webRequest = new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method ?? "GET") ? undefined : req.body,
  });

  return server.fetch(webRequest);
}
