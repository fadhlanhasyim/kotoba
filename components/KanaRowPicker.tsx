"use client";

import type { DrillKana } from "@/lib/types";
import { ROW_LABELS, rowStatus, type KanaRow } from "@/lib/kana";

const STATUS_META = {
  mastered: { color: "var(--teal-400)", text: "mastered" },
  learning: { color: "var(--accent)", text: "learning" },
  new: { color: "var(--text-muted)", text: "not started" },
} as const;

// Pedagogical groupings of the 28 rows — mirrors the plain/extended split the
// learning path uses (core = 0-9), just one level finer for browsing.
const SECTIONS: { title: string; hint: string; range: [number, number] }[] = [
  { title: "Gojuon", hint: "the core 46 sounds", range: [0, 9] },
  { title: "Dakuten & handakuten", hint: "voiced variants", range: [10, 14] },
  { title: "Yōon", hint: "glide combos", range: [15, 25] },
  { title: "Sokuon & chōon", hint: "doubling & long vowels", range: [26, 27] },
];

// Each character wears its own progress state, so a row card reads at a glance:
// what's done (teal), what's in flight (coral), what hasn't been touched (ink).
export function charColor(c: DrillKana): string {
  if (c.progress?.mastered_at) return "var(--teal-400)";
  if (c.progress) return "var(--accent)";
  return "inherit";
}

function RowCard({
  row,
  recommended,
  onSelect,
}: {
  row: KanaRow;
  recommended: boolean;
  onSelect: (row: KanaRow) => void;
}) {
  const status = rowStatus(row);
  const meta = STATUS_META[status];
  const total = row.characters.length;
  const masteredCount = row.characters.filter((c) => c.progress?.mastered_at).length;
  const learningCount = row.characters.filter((c) => c.progress && !c.progress.mastered_at).length;

  return (
    <button
      onClick={() => onSelect(row)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 10,
        padding: "16px",
        textAlign: "left",
        borderLeft: `3px solid ${meta.color}`,
        borderTop: "1px solid var(--border)",
        borderRight: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--surface-1)",
        height: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
          {ROW_LABELS[row.rowIndex]}-row
        </span>
        {recommended && <span className="badge">continue</span>}
      </div>
      <div className="jp" style={{ fontSize: 26, display: "flex", gap: 8 }}>
        {row.characters.map((c) => (
          <span key={c.id} style={{ color: charColor(c) }}>
            {c.character}
          </span>
        ))}
      </div>
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          height: 4,
          borderRadius: "var(--radius-pill)",
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${(masteredCount / total) * 100}%`, background: "var(--teal-400)" }} />
        <div style={{ width: `${(learningCount / total) * 100}%`, background: "var(--accent)" }} />
      </div>
      <span style={{ fontSize: 12.5, color: meta.color, fontWeight: 500 }}>
        {status === "new" ? "not started" : `${masteredCount}/${total} mastered`}
      </span>
    </button>
  );
}

export default function KanaRowPicker({
  rows,
  recommendedKey,
  onSelect,
}: {
  rows: KanaRow[];
  recommendedKey: string | null;
  onSelect: (row: KanaRow) => void;
}) {
  const scripts = Array.from(new Set(rows.map((r) => r.script)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {scripts.map((script) => (
        <div key={script}>
          {scripts.length > 1 && <h2 style={{ marginBottom: 14, textTransform: "capitalize" }}>{script}</h2>}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {SECTIONS.map((section) => {
              const sectionRows = rows.filter(
                (r) => r.script === script && r.rowIndex >= section.range[0] && r.rowIndex <= section.range[1]
              );
              if (sectionRows.length === 0) return null;
              const chars = sectionRows.flatMap((r) => r.characters);
              const mastered = chars.filter((c) => c.progress?.mastered_at).length;
              return (
                <div key={section.title}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <h3 className="caption" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {section.title}
                      <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                        {" "}
                        · {section.hint}
                      </span>
                    </h3>
                    <span className="caption" style={{ whiteSpace: "nowrap" }}>
                      {mastered}/{chars.length}
                    </span>
                  </div>
                  <div
                    style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}
                  >
                    {sectionRows.map((row) => (
                      <RowCard key={row.key} row={row} recommended={row.key === recommendedKey} onSelect={onSelect} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
