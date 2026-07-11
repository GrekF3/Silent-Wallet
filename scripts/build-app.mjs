import { existsSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const apiDir = join(process.cwd(), "src", "app", "api");
const parkedDir = join(process.cwd(), "src", "_app_api_routes_for_proxy_only");
let moved = false;

try {
  rmSync(join(process.cwd(), ".next"), { recursive: true, force: true });
  rmSync(join(process.cwd(), "out"), { recursive: true, force: true });

  if (existsSync(apiDir)) {
    if (existsSync(parkedDir)) {
      throw new Error(`${parkedDir} already exists; refusing to overwrite it.`);
    }
    renameSync(apiDir, parkedDir);
    moved = true;
  }

  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "build"],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        SILENT_APP_SHELL: "1",
        NEXT_PUBLIC_DATA_PROXY_URL: process.env.NEXT_PUBLIC_DATA_PROXY_URL || "https://app.swallet.site",
      },
    }
  );

  if (result.error) {
    console.error(result.error);
  }

  process.exitCode = result.status ?? 1;
} finally {
  if (moved) {
    renameSync(parkedDir, apiDir);
  }
}
