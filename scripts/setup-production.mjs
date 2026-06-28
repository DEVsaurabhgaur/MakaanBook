import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env", "utf-8").split("\n").reduce((acc, line) => {
  const [k, v] = line.split("=");
  if (k && v) acc[k.trim()] = v.trim().replace(/^["']|["']$/g, "");
  return acc;
}, {});

const SUPABASE_URL = env.SUPABASE_URL || "https://xmozlsiyotghhpdcuhqw.supabase.co";
const SUPABASE_SECRET_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
});

async function createBuckets() {
  console.log("\n📦 Creating Supabase Storage Buckets...\n");

  const buckets = [
    { name: "profile-pics", public: true },
    { name: "id-proofs", public: false },
    { name: "payment-proofs", public: false },
  ];

  for (const bucket of buckets) {
    const { data, error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: 10485760, // 10 MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    });

    if (error && error.message?.includes("already exists")) {
      console.log(`  ⚠️  Bucket "${bucket.name}" already exists — skipping`);
    } else if (error) {
      console.error(`  ❌ Failed to create bucket "${bucket.name}":`, error.message);
    } else {
      console.log(`  ✅ Created bucket "${bucket.name}" (public: ${bucket.public})`);
    }
  }
}

async function listBuckets() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("❌ Could not list buckets:", error.message);
    return;
  }
  console.log("\n📂 Existing buckets:");
  for (const b of data) {
    console.log(`  - ${b.name} (public: ${b.public})`);
  }
}

async function main() {
  console.log("🚀 MakaanBook Production Setup");
  console.log("================================");
  console.log(`Project: ${SUPABASE_URL}`);

  await createBuckets();
  await listBuckets();

  console.log("\n✅ Storage setup complete!");
}

main().catch(console.error);
