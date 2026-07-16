"use client";

import type { DrillKana } from "@/lib/types";
import { speakJapanese } from "@/lib/tts";

export default function KanaRowOverview({
  characters,
  onStart,
}: {
  characters: DrillKana[];
  onStart: () => void;
}) {
  return (
    <div className="card rise" style={{ padding: "32px 24px 24px", textAlign: "center" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
        <span className="badge">
          <i className="ti ti-stack-2" aria-hidden="true" /> {characters[0]?.script} · new group
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(characters.length, 5)}, 1fr)`,
          gap: 12,
          marginBottom: 26,
        }}
      >
        {characters.map((c) => {
          const isSpeakable = !c.romaji.startsWith("(");
          return (
            <button
              key={c.id}
              onClick={() => isSpeakable && speakJapanese(c.character)}
              disabled={!isSpeakable}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "14px 4px",
                borderRadius: "var(--radius)",
                border: "none",
                background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
                cursor: isSpeakable ? "pointer" : "default",
              }}
            >
              <span className="jp" style={{ fontSize: 38 }}>
                {c.character}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{c.romaji}</span>
              {isSpeakable && (
                <i className="ti ti-volume-2" style={{ fontSize: 13, color: "var(--text-muted)" }} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 20, maxWidth: 420, margin: "0 auto 20px" }}>
        Same vowel pattern, one new consonant sound. Tap a tile to hear it, then drill them one at a time.
      </p>
      <button className="btn-primary" onClick={onStart} style={{ minWidth: 180 }}>
        Start this group
      </button>
    </div>
  );
}
