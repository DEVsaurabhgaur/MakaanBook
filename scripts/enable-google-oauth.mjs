// Enable Google OAuth in Supabase once you have Google Cloud credentials
// Usage: node scripts/enable-google-oauth.mjs YOUR_CLIENT_ID YOUR_CLIENT_SECRET

const [,, clientId, clientSecret] = process.argv;

import { readFileSync } from "fs";
const env = readFileSync(".env", "utf-8").split("\n").reduce((acc, line) => {
  const [k, v] = line.split("=");
  if (k && v) acc[k.trim()] = v.trim().replace(/^["']|["']$/g, "");
  return acc;
}, {});

const ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  console.error("Error: SUPABASE_ACCESS_TOKEN is missing in your .env file or environment.");
  process.exit(1);
}
const PROJECT_REF = env.SUPABASE_PROJECT_ID || "xmozlsiyotghhpdcuhqw";
const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${ACCESS_TOKEN}` };

if (!clientId || !clientSecret) {
  console.log("Usage: node scripts/enable-google-oauth.mjs <CLIENT_ID> <CLIENT_SECRET>");
  console.log("\nHow to get these:");
  console.log("1. Go to https://console.cloud.google.com");
  console.log("2. Create/Select a project");
  console.log("3. APIs & Services → Credentials → Create OAuth 2.0 Client ID");
  console.log("4. Application type: Web application");
  console.log(`5. Authorized redirect URI: https://${PROJECT_REF}.supabase.co/auth/v1/callback`);
  console.log("6. Also add: https://makaan-book.vercel.app/auth");
  console.log("7. Copy Client ID and Client Secret, then run this script");
  process.exit(1);
}

async function enableGoogleOAuth() {
  console.log("\n🔑 Enabling Google OAuth in Supabase...\n");

  const res = await fetch(`${API_BASE}/config/auth`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      external_google_enabled: true,
      external_google_client_id: clientId,
      external_google_secret: clientSecret,
    }),
  });

  const data = await res.json();

  if (res.ok) {
    console.log("  ✅ Google OAuth ENABLED successfully!");
    console.log("  Client ID:", clientId.slice(0, 20) + "...");
    console.log("\n  Users can now sign in with Google at:");
    console.log("  https://makaan-book.vercel.app/auth");
  } else {
    console.error("  ❌ Failed:", JSON.stringify(data));
  }
}

enableGoogleOAuth().catch(console.error);
