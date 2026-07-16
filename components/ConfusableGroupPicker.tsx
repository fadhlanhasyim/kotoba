"use client";

import type { DrillKana } from "@/lib/types";
import { confusableGroupStatus, type ConfusableGroup } from "@/lib/kana";

const STATUS_META = {
  ready: { color: "var(--accent)", text: "ready to drill" },
  mastered: { color: "var(--teal-400)", text: "practice anyway" },
  locked: { color: "var(--text-muted)", text: "introduce these first" },
} as const;

export default function ConfusableGroupPicker({
  groups,
  onSelect,
}: {
  groups: { group: ConfusableGroup; members: DrillKana[] }[];
  onSelect: (group: ConfusableGroup, members: DrillKana[]) => void;
}) {
  if (groups.length === 0) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      {groups.map(({ group, members }) => {
        const status = confusableGroupStatus(members);
        const meta = STATUS_META[status];
        const locked = status === "locked";
        return (
          <button
            key={group.id}
            onClick={() => !locked && onSelect(group, members)}
            disabled={locked}
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
              opacity: locked ? 0.6 : 1,
              cursor: locked ? "default" : "pointer",
            }}
          >
            <div className="jp" style={{ fontSize: 26, display: "flex", gap: 10 }}>
              {members.map((c) => (
                <span key={c.id}>{c.character}</span>
              ))}
            </div>
            <span style={{ fontSize: 13, color: meta.color, fontWeight: 500 }}>{meta.text}</span>
          </button>
        );
      })}
    </div>
  );
}
