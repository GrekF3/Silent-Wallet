import { createHash } from "node:crypto";

const [licenseKey, salt] = process.argv.slice(2);

if (!licenseKey || !salt) {
  console.error('Usage: node scripts/hash-license.mjs "SW-PRO-XXXX-XXXX" "your-salt"');
  process.exit(1);
}

const normalized = licenseKey.trim().toUpperCase();
const hash = createHash("sha256").update(`${normalized}${salt}`).digest("hex");

console.log(hash);
