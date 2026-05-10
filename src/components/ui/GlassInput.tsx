"use client";
import type { InputHTMLAttributes } from "react";

type GlassInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  suffix?: string;
  prefix?: string;
};

export function GlassInput({ label, suffix, prefix, style, onFocus, onBlur, ...props }: GlassInputProps) {
  const inputStyle: React.CSSProperties = {
    width:        "100%",
    height:       48,
    paddingLeft:  prefix ? 36 : 16,
    paddingRight: suffix ? 48 : 16,
    borderRadius: 14,
    border:       "1px solid rgba(255,255,255,0.10)",
    borderTop:    "1px solid rgba(255,255,255,0.18)",
    background:   "rgba(255,255,255,0.05)",
    color:        "#fff",
    fontSize:     15,
    fontFamily:   "inherit",
    fontWeight:   400,
    outline:      "none",
    boxShadow: [
      "0 2px 8px rgba(0,0,0,0.45)",
      "inset 0 1px 0 rgba(255,255,255,0.07)",
      "inset 0 -1px 0 rgba(0,0,0,0.18)",
      "inset 0 2px 8px rgba(0,0,0,0.12)",
    ].join(", "),
    transition: "background 0.18s, border-color 0.18s, box-shadow 0.18s",
    ...style,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {label && (
        <label className="label" style={{ paddingLeft: 2 }}>{label}</label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && (
          <span style={{
            position:       "absolute",
            left:           14,
            color:          "rgba(255,255,255,0.28)",
            fontSize:       14,
            pointerEvents:  "none",
            userSelect:     "none",
          }}>
            {prefix}
          </span>
        )}
        <input
          style={inputStyle}
          placeholder={props.placeholder}
          onFocus={(e) => {
            e.currentTarget.style.background    = "rgba(255,255,255,0.075)";
            e.currentTarget.style.borderColor   = "rgba(255,255,255,0.20)";
            e.currentTarget.style.borderTopColor = "rgba(255,255,255,0.32)";
            onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.background    = "rgba(255,255,255,0.05)";
            e.currentTarget.style.borderColor   = "rgba(255,255,255,0.10)";
            e.currentTarget.style.borderTopColor = "rgba(255,255,255,0.18)";
            onBlur?.(e);
          }}
          {...props}
        />
        {suffix && (
          <span style={{
            position:       "absolute",
            right:          16,
            color:          "rgba(255,255,255,0.26)",
            fontSize:       13,
            fontWeight:     500,
            pointerEvents:  "none",
            userSelect:     "none",
            fontFamily:     "inherit",
          }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
