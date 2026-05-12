import packageInfo from "../../package.json";

export const APP_VERSION = packageInfo.version;
export const DEFAULT_UPDATE_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_UPDATE_DOWNLOAD_URL || "https://github.com/GrekF3/Silent-Wallet/releases/latest";

export const CHANGELOG_BY_VERSION: Record<string, string[]> = {
  "0.1.4": [
    "macOS release packaging fix.",
    "Wallet creation stability hotfix.",
    "Safer encrypted storage fallback.",
  ],
  "0.1.3": [
    "macOS wallet creation fix.",
    "Safer encrypted storage fallback.",
    "Unlock stability improvements.",
  ],
  "0.1.2": [
    "UI refinements across wallet navigation, asset views, history, and loading states.",
    "Web3 added with Buy, Sell, Swap, and Bridge flows inside the wallet.",
    "Transparent fee review for provider, integrator, and Silent Wallet fees.",
    "Real portfolio charts with hover price points and timestamps.",
    "Update notice with changelog, dismiss action, and signed desktop update flow.",
  ],
};

export function compareVersions(a: string, b: string) {
  const parse = (value: string) => value.replace(/^v/i, "").split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

export function parseReleaseNotes(notes?: string, version?: string) {
  const fromNotes = notes
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""))
    .slice(0, 6);

  if (fromNotes?.length) return fromNotes;
  return version ? CHANGELOG_BY_VERSION[version] ?? [] : [];
}
