// Vercel Serverless Function — SSR catch-all for TanStack Start
// Bridges Node.js req/res to Web API Request/Response
import { Readable } from "node:stream";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    const { default: server } = await import("../dist/server/server.js");

    const host = req.headers.host || "localhost";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const url = `${protocol}://${host}${req.url}`;

    // Convert Node.js IncomingMessage headers to Web Headers
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          for (const val of value) headers.append(key, val);
        } else {
          headers.set(key, value);
        }
      }
    }

    const hasBody = !["GET", "HEAD"].includes(req.method || "GET");
    const webRequest = new Request(url, {
      method: req.method,
      headers,
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
}
