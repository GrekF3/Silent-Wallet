import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Silent — Crypto Wallet",
  description: "Minimal crypto wallet",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "256x256" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden" style={{ background: "#080808" }}>
        {children}
      </body>
    </html>
  );
}
