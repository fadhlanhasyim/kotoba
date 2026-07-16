"use client";

import type { DrillKana } from "@/lib/types";
import type { QuizDirection } from "@/lib/kana";
import { speakJapanese } from "@/lib/tts";

export default function KanaCard({
  kana,
  mode,
  direction,
  revealed,
  onReveal,
  onGrade,
  onLearned,
  progressHint,
}: {
  kana: DrillKana;
  mode: "learn" | "quiz";
  direction?: QuizDirection;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (gotIt: boolean) => void;
  onLearned: () => void;
  progressHint?: string;
}) {
  const showAnswer = mode === "learn" || revealed;
  // Learn mode always shows the character first (that's the introduction).
  // Quiz mode can go either way: recognize (character -> romaji) or recall (romaji -> character).
  const promptIsKana = mode === "learn" || direction !== "toKana";
  // Sokuon/chōon have no standalone sound (they modify a neighboring character) — romaji for
  // those is a label like "(sokuon)", not real romaji, so there's nothing to speak.
  const isSpeakable = !kana.romaji.startsWith("(");

  return (
    <div className="card rise" style={{ padding: "36px 24px 24px", textAlign: "center" }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
        <span className={mode === "learn" ? "badge" : "badge badge-neutral"}>
          {mode === "learn" ? (
            <>
              <i className="ti ti-sparkles" aria-hidden="true" /> new
            </>
          ) : direction === "toKana" ? (
            <>{kana.script} &middot; recall</>
          ) : (
            kana.script
          )}
        </span>
      </div>

      {promptIsKana ? (
        <div className="jp" style={{ fontSize: 96, marginBottom: showAnswer ? 18 : 28 }}>
          {kana.character}
        </div>
      ) : (
        <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: showAnswer ? 18 : 28 }}>
          {kana.romaji}
        </div>
      )}

      {showAnswer ? (
        <>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18, marginBottom: 22 }}>
            {promptIsKana ? (
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6 }}>
                {kana.romaji}
              </div>
            ) : (
              <div className="jp" style={{ fontSize: 56, marginBottom: 6 }}>
                {kana.character}
              </div>
            )}
            <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: isSpeakable ? 12 : 0 }}>
              {kana.mnemonic}
            </p>
            {isSpeakable && (
              <button
                onClick={() => speakJapanese(kana.character)}
                aria-label="Play pronunciation"
                style={{
                  width: 38,
                  height: 38,
                  padding: 0,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="ti ti-volume-2" aria-hidden="true" />
              </button>
            )}
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
