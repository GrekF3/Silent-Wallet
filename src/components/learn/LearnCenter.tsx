"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GlassInput } from "@/components/ui/GlassInput";
import { Icons } from "@/components/ui/Icon";
import { EmptyState } from "@/components/common/EmptyState";
import { LEARN_ARTICLES, useLearnProgress, type LearnArticle } from "@/lib/learn/articles";
import { LearnArticleCard } from "./LearnArticleCard";
import { LearnArticleView } from "./LearnArticleView";

export function LearnCenter() {
  const completed = useLearnProgress();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LearnArticle["category"] | "all">("all");
  const [selected, setSelected] = useState<LearnArticle | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return LEARN_ARTICLES.filter((article) => category === "all" || article.category === category)
      .filter((article) => !q || `${article.title} ${article.summary} ${article.body.join(" ")}`.toLowerCase().includes(q));
  }, [category, query]);

  return (
    <motion.div className="view-shell" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      style={{ padding: "32px 28px", maxWidth: 720, display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <span className="label">Academy</span>
        <div style={{ marginTop: 8, fontSize: 28, fontWeight: 300, color: "#fff", letterSpacing: 0 }}>Understand Web3 without the noise.</div>
      </div>

      {selected ? (
        <LearnArticleView article={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
            <GlassInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search articles" />
            <div style={{ display: "flex", padding: 3, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
              {(["all", "basics", "safety", "web3"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  style={{ height: 36, padding: "0 12px", borderRadius: 11, border: "none", background: category === item ? "rgba(255,255,255,0.10)" : "transparent", color: category === item ? "#fff" : "rgba(255,255,255,0.36)", font: "inherit", fontSize: 12, fontWeight: 650, cursor: "pointer", textTransform: "capitalize" }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((article) => (
              <LearnArticleCard key={article.slug} article={article} completed={completed.includes(article.slug)} onOpen={() => setSelected(article)} />
            ))}
            {filtered.length === 0 && <EmptyState icon="search" title="Nothing found." body="Try a shorter search or another topic." />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.28)", fontSize: 12 }}>
            <Icons.check size={13} /> {completed.length}/{LEARN_ARTICLES.length} read
          </div>
        </>
      )}
    </motion.div>
  );
}
