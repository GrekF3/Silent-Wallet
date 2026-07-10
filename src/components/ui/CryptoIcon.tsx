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
  USDT: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png",
  "BSC-USD": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/0x55d398326f99059fF775485246999027B3197955/logo.png",
  BUSD: "https://coin-images.coingecko.com/coins/images/9576/large/BUSD.png",
  DAI:  "https://coin-images.coingecko.com/coins/images/9956/large/Badge_Dai.png",
  SOL:  "https://coin-images.coingecko.com/coins/images/4128/large/solana.png",
};

export function CryptoIcon({ symbol, image, size = 28 }: Props) {
  const src = image || FALLBACKS[symbol.toUpperCase()];
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <span style={{
        fontSize:   size * 0.58,
        fontWeight: 700,
        color:      "#fff",
        lineHeight: 1,
        width:      size,
        height:     size,
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
        filter:     "drop-shadow(0 8px 14px rgba(0,0,0,0.45))",
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
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
        filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.45))",
      }}
    />
  );
}
