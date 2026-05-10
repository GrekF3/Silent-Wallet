"use client";
import { useState } from "react";

type Props = {
  symbol:  string;
  image?:  string;   // CoinGecko CDN URL
  size?:   number;
};

const FALLBACKS: Record<string, string> = {
  ETH:  "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  BTC:  "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
  BNB:  "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  USDC: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png",
};

export function CryptoIcon({ symbol, image, size = 28 }: Props) {
  const src = image || FALLBACKS[symbol.toUpperCase()];
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <span style={{
        fontSize:   size * 0.52,
        fontWeight: 700,
        color:      "#fff",
        lineHeight: 1,
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {symbol[0]}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={symbol}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
    />
  );
}
