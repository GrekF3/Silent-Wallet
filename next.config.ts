import type { NextConfig } from "next";

const appShell = process.env.SILENT_APP_SHELL === "1";

const nextConfig: NextConfig = {
  output: appShell ? "export" : "standalone",
  images: {
    unoptimized: appShell,
  },
};

export default nextConfig;
