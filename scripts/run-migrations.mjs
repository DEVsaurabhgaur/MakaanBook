// MakaanBook — Complete Production Setup via Supabase Management API
// Uses personal access token to run migrations, configure auth, enable Google OAuth

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = readFileSync(join(__dirname, "..", ".env"), "utf-8").split("\n").reduce((acc, line) => {
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
const SUPABASE_URL = env.SUPABASE_URL || `https://xmozlsiyotghhpdcuhqw.supabase.co`;
const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${ACCESS_TOKEN}`,
};

// ── SQL Execution ─────────────────────────────────────────────────────────────
async function execSQL(sql) {
  const res = await fetch(`${API_BASE}/database/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: sql }),
  });
  return { status: res.status, data: await res.json() };
}

// ── Run Migrations ─────────────────────────────────────────────────────────────
async function runMigrations() {
  console.log("═══════════════════════════════════════════");
  console.log("  📦 Running Database Migrations");
  console.log("═══════════════════════════════════════════\n");

  const migrations = [
    "20260614172239_17f4f0f5-324c-4e54-a8ea-0f3ff4503af2.sql",
    "20260614172314_a8ace137-347f-4ac7-b5e0-3fc721b3c105.sql",
    "20260614174520_f3f4d8f8-09c5-448e-8824-097a2c661cf0.sql",
    "20260614180000_features_and_meter.sql",
  ];

  const actualFiles = [
    "20260614172239_17f4f0f5-324c-4e54-a8ea-0f3ff4503af2.sql",
    "20260614172314_a8ace137-347f-4ac7-b5e0-3fc721b3c105.sql",
    "20260614174520_f3f4d8f8-09c5-448e-8824-097a2c661fc0.sql",
    "20260614180000_features_and_meter.sql",
  ];

  let allOk = true;
  for (const file of actualFiles) {
    const filePath = join(__dirname, "..", "supabase", "migrations", file);
    const sql = readFileSync(filePath, "utf-8");
    console.log(`📝 ${file}`);

    const result = await execSQL(sql);
    if (result.status === 200) {
      console.log(`  ✅ Success\n`);
    } else {
      const errMsg = result.data?.message || JSON.stringify(result.data);
      // If it already exists, that's OK
      if (errMsg.includes("already exists") || errMsg.includes("duplicate") || errMsg.includes("42710") || errMsg.includes("42P07")) {
        console.log(`  ⚠️  Already applied (schema exists) — OK\n`);
      } else {
        console.log(`  ❌ HTTP ${result.status}: ${errMsg.slice(0, 200)}\n`);
        allOk = false;
      }
    }
  }

  return allOk;
}

// ── Configure Auth URLs ────────────────────────────────────────────────────────
async function configureAuthURLs() {
  console.log("═══════════════════════════════════════════");
  console.log("  🔗 Configuring Auth Redirect URLs");
  console.log("═══════════════════════════════════════════\n");

  const res = await fetch(`${API_BASE}/config/auth`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      site_url: "https://makaan-book.vercel.app",
      additional_redirect_urls: [
        "https://makaan-book.vercel.app/**",
        "https://makaan-book.vercel.app/app",
        "https://makaan-book.vercel.app/auth",
      ],
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log("  ✅ Site URL: https://makaan-book.vercel.app");
    console.log("  ✅ Redirect URL: https://makaan-book.vercel.app/**\n");
  } else {
    console.log(`  ❌ Failed (${res.status}):`, JSON.stringify(data).slice(0, 300), "\n");
  }
}

// ── Check Tables ──────────────────────────────────────────────────────────────
async function checkTables() {
  console.log("═══════════════════════════════════════════");
  console.log("  📋 Verifying Database Tables");
  console.log("═══════════════════════════════════════════\n");

  const checkSQL = `
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  const result = await execSQL(checkSQL);
  if (result.status === 200 && Array.isArray(result.data)) {
    for (const row of result.data) {
      console.log(`  ✅ Table: ${row.table_name}`);
    }
    console.log();
  } else {
    console.log("  Could not list tables:", JSON.stringify(result.data).slice(0, 200), "\n");
  }
}

// ── Enable Google OAuth ────────────────────────────────────────────────────────
async function getGoogleOAuthStatus() {
  console.log("═══════════════════════════════════════════");
  console.log("  🔑 Google OAuth Provider Status");
  console.log("═══════════════════════════════════════════\n");

  const res = await fetch(`${API_BASE}/config/auth`, { headers });
  const data = await res.json();

  const googleEnabled = data?.external_google_enabled;
  const clientId = data?.external_google_client_id;

  if (googleEnabled) {
    console.log("  ✅ Google OAuth is ENABLED\n");
  } else {
    console.log("  ❌ Google OAuth is NOT enabled");
    console.log("  → You need to set up Google Cloud OAuth credentials first\n");
    console.log("  Steps to enable Google OAuth:");
    console.log("  1. Go to: https://console.cloud.google.com");
    console.log("  2. Create OAuth 2.0 Client ID (Web Application type)");
    console.log(`  3. Authorized redirect URI: https://${PROJECT_REF}.supabase.co/auth/v1/callback`);
    console.log("  4. Copy Client ID and Client Secret");
    console.log("  5. Run: node scripts/enable-google-oauth.mjs <CLIENT_ID> <CLIENT_SECRET>\n");
  }

  return { googleEnabled, clientId };
}

// ── Check Site URL ─────────────────────────────────────────────────────────────
async function checkAuthConfig() {
  const res = await fetch(`${API_BASE}/config/auth`, { headers });
  const data = await res.json();
  console.log("  Site URL:", data?.site_url || "(not set)");
  console.log("  Redirect URLs:", JSON.stringify(data?.additional_redirect_urls || []));
  console.log();
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🚀 MakaanBook — Complete Production Setup");
  console.log("==========================================\n");

  // Step 1: Configure Auth URLs
  await configureAuthURLs();

  // Step 2: Run migrations
  await runMigrations();

  // Step 3: Verify tables
  await checkTables();

  // Step 4: Google OAuth status
  await getGoogleOAuthStatus();

  // Step 5: Show current auth config
  console.log("═══════════════════════════════════════════");
  console.log("  📊 Final Auth Config");
  console.log("═══════════════════════════════════════════\n");
  await checkAuthConfig();

  console.log("✅ Setup complete!");
}

main().catch(console.error);
