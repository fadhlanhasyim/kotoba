"use client";

import { ROW_LABELS, rowStatus, type KanaRow } from "@/lib/kana";

const STATUS_META = {
  mastered: { color: "var(--teal-400)", text: "mastered" },
  learning: { color: "var(--accent)", text: "learning" },
  new: { color: "var(--text-muted)", text: "not started" },
} as const;

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
  const masteredCount = row.characters.filter((c) => c.progress?.mastered_at).length;

  return (
    <button
      onClick={() => onSelect(row)}
      style={{
        display: "flex",
        flexDirection: "column",
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
          <span key={c.id}>{c.character}</span>
        ))}
      </div>
      <span style={{ fontSize: 13, color: meta.color, fontWeight: 500 }}>
        {status === "new" ? meta.text : `${masteredCount}/${row.characters.length} ${meta.text}`}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {scripts.map((script) => (
        <div key={script}>
          {scripts.length > 1 && (
            <h2 style={{ marginBottom: 10, textTransform: "capitalize" }}>{script}</h2>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {rows
              .filter((r) => r.script === script)
              .map((row) => (
                <RowCard key={row.key} row={row} recommended={row.key === recommendedKey} onSelect={onSelect} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
