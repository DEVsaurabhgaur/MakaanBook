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

async function execSQL(sql) {
  const res = await fetch(`${API_BASE}/database/query`, { method: "POST", headers, body: JSON.stringify({ query: sql }) });
  return { status: res.status, data: await res.json() };
}

async function fixAuthRedirectURLs() {
  console.log("🔗 Fixing Auth Redirect URLs...\n");

  // Try the correct field: uri_allow_list (Supabase internal name)
  const attempts = [
    { uri_allow_list: "https://makaan-book.vercel.app/**" },
    { additional_redirect_urls: ["https://makaan-book.vercel.app/**"] },
  ];

  for (const body of attempts) {
    const res = await fetch(`${API_BASE}/config/auth`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ site_url: "https://makaan-book.vercel.app", ...body }),
    });
    const data = await res.json();
    const keys = Object.keys(body);
    if (res.ok) {
      console.log(`  ✅ Auth config updated with ${keys.join(", ")}`);
      
      // Verify
      const checkRes = await fetch(`${API_BASE}/config/auth`, { headers });
      const checkData = await checkRes.json();
      console.log("  Site URL:", checkData?.site_url);
      console.log("  uri_allow_list:", JSON.stringify(checkData?.uri_allow_list));
      console.log("  additional_redirect_urls:", JSON.stringify(checkData?.additional_redirect_urls));
      break;
    } else {
      console.log(`  ⚠️  Tried ${keys.join(", ")}: ${JSON.stringify(data).slice(0, 100)}`);
    }
  }
  console.log();
}

async function checkAllTables() {
  console.log("📋 Database Tables:\n");
  const result = await execSQL(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  if (result.status < 300 && Array.isArray(result.data)) {
    for (const row of result.data) console.log(`  ✅ ${row.table_name}`);
  } else {
    // Response is an array directly
    const rows = Array.isArray(result.data) ? result.data : [];
    rows.forEach(r => console.log(`  ✅ ${r.table_name || JSON.stringify(r)}`));
  }
  console.log();
}

async function runMigration4() {
  console.log("📝 Re-running migration 4 to ensure it applied...\n");
  const { readFileSync } = await import("fs");
  const { join, dirname } = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", "20260614180000_features_and_meter.sql"), "utf-8");
  const result = await execSQL(sql);
  if (result.status < 300) {
    console.log("  ✅ Migration 4 applied successfully");
  } else {
    const msg = (result.data?.message || JSON.stringify(result.data)).slice(0, 200);
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      console.log("  ✅ Migration 4 already applied — OK");
    } else {
      console.log("  ❌", msg);
    }
  }
  console.log();
}

async function main() {
  console.log("\n🔧 MakaanBook — Fix & Verify\n");
  await fixAuthRedirectURLs();
  await runMigration4();
  await checkAllTables();
  console.log("✅ Done!");
}
main().catch(console.error);
