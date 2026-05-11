"use client";

import Image from "next/image";
import type { CSSProperties, HTMLAttributes } from "react";

type BrandLogoProps = HTMLAttributes<HTMLSpanElement> & {
  size?: number;
  label?: string;
  caption?: string;
  orientation?: "row" | "column";
  reveal?: "hover" | "always";
};

export function BrandLogo({
  size = 36,
  label = "Silent",
  caption,
  orientation = "row",
  reveal = "hover",
  className,
  style,
  ...props
}: BrandLogoProps) {
  const rootStyle = {
    "--brand-logo-size": `${size}px`,
    ...style,
  } as CSSProperties;

  return (
    <span
      className={[
        "brand-logo",
        `brand-logo-${orientation}`,
        `brand-logo-${reveal}`,
        className,
      ].filter(Boolean).join(" ")}
      style={rootStyle}
      {...props}
    >
      <span className="brand-logo-mark" aria-hidden>
        <Image src="/logo.png" alt="" width={size} height={size} priority />
      </span>
      <span className="brand-logo-copy">
        <span className="brand-logo-text">{label}</span>
        {caption && <span className="brand-logo-caption">{caption}</span>}
      </span>
    </span>
  );
}
