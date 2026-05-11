const DATA_PROXY_URL = process.env.NEXT_PUBLIC_DATA_PROXY_URL?.replace(/\/$/, "") ?? "";

export function dataProxyPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${DATA_PROXY_URL}${normalized}`;
}
