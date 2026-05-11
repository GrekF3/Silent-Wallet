const required = [
  "TAURI_SIGNING_PRIVATE_KEY",
  "TAURI_SIGNING_PRIVATE_KEY_PASSWORD"
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing release secrets: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Release signing environment is present.");
