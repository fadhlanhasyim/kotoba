"use client";

import type { DrillKana } from "@/lib/types";

export default function KanaCard({
  kana,
  mode,
  revealed,
  onReveal,
  onGrade,
  onLearned,
  progressHint,
}: {
  kana: DrillKana;
  mode: "learn" | "quiz";
  revealed: boolean;
  onReveal: () => void;
  onGrade: (gotIt: boolean) => void;
  onLearned: () => void;
  progressHint?: string;
}) {
  const showAnswer = mode === "learn" || revealed;

  return (
    <div className="card rise" style={{ padding: "36px 24px 24px", textAlign: "center" }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
        <span className={mode === "learn" ? "badge" : "badge badge-neutral"}>
          {mode === "learn" ? (
            <>
              <i className="ti ti-sparkles" aria-hidden="true" /> new
            </>
          ) : (
            kana.script
          )}
        </span>
      </div>

      <div className="jp" style={{ fontSize: 96, marginBottom: showAnswer ? 18 : 28 }}>
        {kana.character}
      </div>

      {showAnswer ? (
        <>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, marginBottom: 22 }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6 }}>
              {kana.romaji}
            </div>
            <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>{kana.mnemonic}</p>
          </div>

          {mode === "learn" ? (
            <button className="btn-primary" onClick={onLearned} style={{ minWidth: 160 }}>
              Got it, next
              <i className="ti ti-arrow-right" style={{ marginLeft: 6, verticalAlign: "-2px" }} aria-hidden="true" />
            </button>
          ) : (
            <>
              {progressHint && (
                <p className="caption" style={{ marginBottom: 12 }}>
                  {progressHint}
                </p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <button
                  onClick={() => onGrade(false)}
                  style={{ padding: "12px", borderTop: "3px solid var(--red-500)" }}
                >
                  Missed it
                </button>
                <button
                  onClick={() => onGrade(true)}
                  style={{ padding: "12px", borderTop: "3px solid var(--teal-400)" }}
                >
                  Got it
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <button className="btn-primary" onClick={onReveal} style={{ minWidth: 160 }}>
          Show answer
        </button>
      )}
    </div>
  );
}
