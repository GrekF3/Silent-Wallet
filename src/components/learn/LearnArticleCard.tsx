"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Icons } from "@/components/ui/Icon";
import type { LearnArticle } from "@/lib/learn/articles";

export function LearnArticleCard({
  article,
  completed,
  onOpen,
}: {
  article: LearnArticle;
  completed: boolean;
  onOpen: () => void;
}) {
  return (
    <GlassCard hover onClick={onOpen} style={{ padding: 16, cursor: "pointer", borderRadius: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
        <div style={{ width: 38, height: 38, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.09)", flexShrink: 0 }}>
          {completed ? <Icons.check size={16} color="rgba(255,255,255,0.72)" /> : <Icons.info size={16} color="rgba(255,255,255,0.42)" />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 650, color: "#fff", marginBottom: 5 }}>{article.title}</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.36)" }}>{article.summary}</div>
          <div style={{ marginTop: 11, display: "flex", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.24)" }}>
            <span>{article.readTime}</span>
            <span>·</span>
            <span style={{ textTransform: "capitalize" }}>{article.category}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
