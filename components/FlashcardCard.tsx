"use client";

import type { Card } from "@/lib/types";
import type { Grade } from "@/lib/srs";

const GRADE_META: Record<Grade, { color: string; sub: string }> = {
  again: { color: "var(--red-500)", sub: "<1m" },
  hard: { color: "var(--amber-500)", sub: "soon" },
  good: { color: "var(--teal-400)", sub: "days" },
  easy: { color: "var(--blue-500)", sub: "weeks" },
};

export default function FlashcardCard({
  card,
  revealed,
  onReveal,
  onGrade,
}: {
  card: Card;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (grade: Grade) => void;
}) {
  return (
    <div className="card rise" style={{ padding: "36px 24px 24px", textAlign: "center" }}>
      <div style={{ marginBottom: 22, display: "flex", justifyContent: "center" }}>
        <span className="badge">{card.type}</span>
      </div>

      <div className="jp" style={{ fontSize: 68, marginBottom: revealed ? 18 : 28 }}>
        {card.term}
      </div>

      {revealed ? (
        <>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, marginBottom: 22 }}>
            {card.reading && (
              <div className="jp" style={{ fontSize: 22, color: "var(--text-secondary)", marginBottom: 6 }}>
                {card.reading}
              </div>
            )}
            <div style={{ fontSize: 17, fontWeight: 500, marginBottom: card.example_sentence ? 12 : 0 }}>
              {card.meaning}
            </div>
            {card.example_sentence && (
              <p className="jp" style={{ fontSize: 16, color: "var(--text-muted)" }}>
                {card.example_sentence}
              </p>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            {(["again", "hard", "good", "easy"] as Grade[]).map((grade) => (
              <button
                key={grade}
                onClick={() => onGrade(grade)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  padding: "9px 4px",
                  borderTop: `3px solid ${GRADE_META[grade].color}`,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{grade}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{GRADE_META[grade].sub}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <button className="btn-primary" onClick={onReveal} style={{ minWidth: 160 }}>
          Show answer
        </button>
      )}
    </div>
  );
}
