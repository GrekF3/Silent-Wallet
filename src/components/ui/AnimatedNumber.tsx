"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  value:     number;
  format:    (v: number) => string;
  style?:    React.CSSProperties;
  className?: string;
};

export function AnimatedNumber({ value, format, style, className }: Props) {
  const [display, setDisplay] = useState(format(value));
  const rafRef  = useRef<number | null>(null);
  const fromRef = useRef(value);
  const toRef   = useRef(value);

  useEffect(() => {
    if (fromRef.current === value) return;
    toRef.current = value;

    const start     = performance.now();
    const duration  = 600;
    const startVal  = fromRef.current;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const elapsed = now - start;
      const t       = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased   = 1 - Math.pow(1 - t, 3);
      const current = startVal + (value - startVal) * eased;
      setDisplay(format(current));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else { fromRef.current = value; setDisplay(format(value)); }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, format]);

  return <span style={style} className={className}>{display}</span>;
}
