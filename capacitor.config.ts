import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.silent.wallet",
  appName: "Silent Wallet",
  webDir: "out",
  backgroundColor: "#080808",
  loggingBehavior: "production",
  server: {
    androidScheme: "https",
    iosScheme: "capacitor"
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false
  },
  ios: {
    scheme: "SilentWallet",
    contentInset: "automatic"
  }
};

export default config;
