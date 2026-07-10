"use client";

import { useEffect } from "react";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Icons } from "@/components/ui/Icon";
import { markLearnArticleRead, type LearnArticle } from "@/lib/learn/articles";

export function LearnArticleView({ article, onBack }: { article: LearnArticle; onBack: () => void }) {
  useEffect(() => {
    markLearnArticleRead(article.slug);
  }, [article.slug]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <GlassButton variant="ghost" size="sm" onClick={onBack} style={{ alignSelf: "flex-start" }}>
        <Icons.arrowLeft size={13} /> Back
      </GlassButton>
      <GlassCard elevated style={{ padding: 24, borderRadius: 22 }}>
        <div className="label" style={{ marginBottom: 12, textTransform: "capitalize" }}>{article.category} · {article.readTime}</div>
        <div style={{ fontSize: 28, fontWeight: 300, color: "#fff", lineHeight: 1.12, letterSpacing: 0 }}>{article.title}</div>
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {article.body.map((paragraph) => (
            <p key={paragraph} style={{ fontSize: 15, lineHeight: 1.72, color: "rgba(255,255,255,0.58)" }}>{paragraph}</p>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
