import { readFileSync } from "fs";
const env = readFileSync(".env", "utf-8").split("\n").reduce((acc, line) => {
  const [k, v] = line.split("=");
  if (k && v) acc[k.trim()] = v.trim().replace(/^["']|["']$/g, "");
  return acc;
}, {});

const SUPABASE_URL = env.SUPABASE_URL || "https://xmozlsiyotghhpdcuhqw.supabase.co";
const SECRET_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = env.SUPABASE_PROJECT_ID || "xmozlsiyotghhpdcuhqw";

// Try setting auth config via Supabase REST meta endpoint
async function setAuthConfig() {
  console.log("\n🔐 Setting Supabase Auth Configuration...\n");

  // Test connectivity first
  const testRes = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
    headers: {
      apikey: SECRET_KEY,
      Authorization: `Bearer ${SECRET_KEY}`,
    },
  });
  const settings = await testRes.json();
  console.log("Current auth settings snippet:", JSON.stringify(settings).slice(0, 200));
}

// Create storage bucket policies via SQL RPC (if exec_sql function exists)
async function checkDatabase() {
  console.log("\n🗄️  Testing database connection...");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?select=*&limit=1`, {
    headers: {
      apikey: SECRET_KEY,
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (res.ok) {
    console.log("  ✅ Database is accessible! user_roles table exists.");
    const data = await res.json();
    console.log(`  📊 Records in user_roles: ${data.length}`);
  } else {
    const err = await res.json();
    if (err.code === "42P01") {
      console.log("  ⚠️  Database tables not yet created — migrations need to be run.");
      console.log("  → Please run migrations in Supabase SQL Editor (see below).");
    } else {
      console.log("  ❌ DB check error:", JSON.stringify(err));
    }
  }
}

async function checkAllTables() {
  const tables = ["user_roles", "properties", "tenants", "rent_payments", "electricity_readings"];
  console.log("\n📋 Checking database tables...\n");

  for (const table of tables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, {
      headers: {
        apikey: SECRET_KEY,
        Authorization: `Bearer ${SECRET_KEY}`,
        "Content-Type": "application/json",
        Prefer: "count=exact",
      },
    });
    if (res.ok) {
      const count = res.headers.get("content-range") || "?";
      console.log(`  ✅ Table "${table}" exists (${count} rows)`);
    } else {
      const err = await res.json();
      if (err.code === "42P01") {
        console.log(`  ❌ Table "${table}" NOT FOUND — migration needed`);
      } else {
        console.log(`  ⚠️  Table "${table}": ${err.message || JSON.stringify(err)}`);
      }
    }
  }
}

async function listBuckets() {
  console.log("\n📦 Storage Buckets Status:\n");
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: {
      apikey: SECRET_KEY,
      Authorization: `Bearer ${SECRET_KEY}`,
    },
  });
  const buckets = await res.json();
  if (Array.isArray(buckets)) {
    for (const b of buckets) {
      console.log(`  ✅ ${b.name} (public: ${b.public})`);
    }
  } else {
    console.log("  Response:", JSON.stringify(buckets));
  }
}

async function main() {
  console.log("🚀 MakaanBook — Production Status Check");
  console.log("=========================================");
  await checkAllTables();
  await listBuckets();
  await setAuthConfig();
  console.log("\n✅ Check complete!");
}

main().catch(console.error);
