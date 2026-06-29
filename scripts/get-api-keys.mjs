// Fetch correct API keys from Supabase Management API to verify project credentials
// Usage: ACCESS_TOKEN=<your-token> node scripts/get-api-keys.mjs
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || "";
const PROJECT_REF = process.env.SUPABASE_PROJECT_ID || "xmozlsiyotghhpdcuhqw";

if (!ACCESS_TOKEN) {
  console.error("❌ Set SUPABASE_ACCESS_TOKEN env var first.");
  process.exit(1);
}

async function fetchAPIKeys() {
  console.log("\n🔑 Fetching official project API keys from Supabase...\n");

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (res.ok) {
    const data = await res.json();
    console.log("Keys fetched successfully:");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error(`❌ Failed (HTTP ${res.status}):`, await res.text());
  }
}

fetchAPIKeys().catch(console.error);
