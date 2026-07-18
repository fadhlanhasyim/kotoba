"use client";

import { useEffect, useState } from "react";
import type { DrillKana } from "@/lib/types";
import type { QuizDirection } from "@/lib/kana";
import { speakJapanese } from "@/lib/tts";
import WritingCanvas from "@/components/WritingCanvas";

const REQUIRED_WRITES = 5;
const WRITING_DEFAULT_KEY = "kotoba:writingPracticeDefault";

export default function KanaCard({
  kana,
  mode,
  direction,
  revealed,
  onReveal,
  onGrade,
  onLearned,
  onSaveMnemonic,
  progressHint,
}: {
  kana: DrillKana;
  mode: "learn" | "quiz";
  direction?: QuizDirection;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (gotIt: boolean) => void;
  onLearned: () => void;
  onSaveMnemonic?: (kanaId: string, mnemonic: string | null) => void;
  progressHint?: string;
}) {
  const showAnswer = mode === "learn" || revealed;
  // Learn mode always shows the character first (that's the introduction).
  // Quiz mode can go either way: recognize (character -> romaji) or recall (romaji -> character).
  const promptIsKana = mode === "learn" || direction !== "toKana";
  // Sokuon/chōon have no standalone sound (they modify a neighboring character) — romaji for
  // those is a label like "(sokuon)", not real romaji, so there's nothing to speak.
  const isSpeakable = !kana.romaji.startsWith("(");

  // The repeat-write drill only applies to learn mode (first exposure to a character) — this
  // mirrors writing a word on paper several times, which quiz/recall mode doesn't need.
  // Reset when the character changes via the parent keying this component on kana.id, not an
  // effect — a fresh mount is the idiomatic way to reset state tied to an identity change.
  const [writeCount, setWriteCount] = useState(0);
  const [canvasKey, setCanvasKey] = useState(0);

  const writingDone = writeCount >= REQUIRED_WRITES;

  // Beyond the mandatory 5, or in quiz mode entirely, writing is optional and unlimited — for
  // extra reps right after the mandatory ones, or to write out a character during ongoing
  // review (including one already mastered, e.g. via a row's "practice again").
  const [practiceWriting, setPracticeWriting] = useState(false);
  const [practiceCanvasKey, setPracticeCanvasKey] = useState(0);
  const showOptionalPractice = mode === "quiz" || writingDone;

  // Default to your last choice instead of making you click every single card — must default
  // to false on the very first render (matching server output) and apply the remembered value
  // post-mount, same hydration-safety reasoning as WritingCanvas's devicePixelRatio read below.
  useEffect(() => {
    if (!showOptionalPractice) return;
    if (localStorage.getItem(WRITING_DEFAULT_KEY) === "open") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPracticeWriting(true);
    }
  }, [showOptionalPractice]);

  function togglePracticeWriting() {
    const next = !practiceWriting;
    if (next) setPracticeCanvasKey((k) => k + 1);
    setPracticeWriting(next);
    try {
      localStorage.setItem(WRITING_DEFAULT_KEY, next ? "open" : "closed");
    } catch {
      // private-browsing/storage-disabled — just skip remembering, not worth surfacing
    }
  }

  // Personal mnemonic override: self-generated mnemonics stick better than
  // provided ones, so the card lets you rewrite it in place. Local state keeps
  // the display in sync immediately (the parent's `current` card object is a
  // snapshot); the component remounts per character via key={kana.id}.
  const [customMnemonic, setCustomMnemonic] = useState<string | null>(kana.custom_mnemonic ?? null);
  const [editingMnemonic, setEditingMnemonic] = useState(false);
  const [mnemonicDraft, setMnemonicDraft] = useState("");
  const shownMnemonic = customMnemonic ?? kana.mnemonic;

  function saveMnemonicDraft() {
    const trimmed = mnemonicDraft.trim();
    const next = trimmed.length > 0 ? trimmed : null;
    setCustomMnemonic(next);
    setEditingMnemonic(false);
    onSaveMnemonic?.(kana.id, next);
  }

  function resetMnemonic() {
    setCustomMnemonic(null);
    setEditingMnemonic(false);
    onSaveMnemonic?.(kana.id, null);
  }

  const mnemonicEditButton = onSaveMnemonic && (
    <button
      onClick={() => {
        setMnemonicDraft(customMnemonic ?? kana.mnemonic);
        setEditingMnemonic(true);
      }}
      aria-label="Edit mnemonic"
      style={{
        padding: 0,
        width: 24,
        height: 24,
        marginLeft: 6,
        verticalAlign: "-6px",
        border: "none",
        background: "transparent",
        boxShadow: "none",
        color: "var(--text-muted)",
        fontSize: 14,
      }}
    >
      <i className="ti ti-pencil" aria-hidden="true" />
    </button>
  );

  const mnemonicEditor = (
    <div style={{ maxWidth: 400, margin: "0 auto 16px", textAlign: "left" }}>
      <textarea
        value={mnemonicDraft}
        onChange={(e) => setMnemonicDraft(e.target.value)}
        rows={2}
        autoFocus
        placeholder="Write your own mnemonic…"
        style={{
          width: "100%",
          fontFamily: "inherit",
          fontSize: 14,
          padding: 10,
          borderRadius: "var(--radius)",
          border: "1px solid var(--border-strong)",
          background: "var(--surface-2)",
          color: "var(--foreground)",
          resize: "vertical",
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn-primary" style={{ fontSize: 13 }} onClick={saveMnemonicDraft}>
          Save
        </button>
        {customMnemonic && (
          <button style={{ fontSize: 13 }} onClick={resetMnemonic}>
            Reset to default
          </button>
        )}
        <button style={{ fontSize: 13 }} onClick={() => setEditingMnemonic(false)}>
          Cancel
        </button>
      </div>
    </div>
  );

  const speakerButton = isSpeakable && (
    <button
      onClick={() => speakJapanese(kana.character)}
      aria-label="Play pronunciation"
      style={{
        width: 38,
        height: 38,
        padding: 0,
        borderRadius: "50%",
        flexShrink: 0,
      }}
    >
      <i className="ti ti-volume-2" aria-hidden="true" />
    </button>
  );

  const practiceToggle = showOptionalPractice && (
    <div style={{ marginBottom: 20 }}>
      <button onClick={togglePracticeWriting} style={{ fontSize: 13 }}>
        <i className="ti ti-pencil" style={{ marginRight: 6, verticalAlign: "-2px" }} aria-hidden="true" />
        {practiceWriting ? "Hide writing practice" : "Practice writing"}
      </button>
      {practiceWriting && (
        <div style={{ marginTop: 14 }}>
          <WritingCanvas key={practiceCanvasKey} guideChar={kana.character} />
        </div>
      )}
    </div>
  );

  if (mode === "learn") {
    // Learn mode is compact by design: the canvas guide already shows the character full-size,
    // so a big stacked intro block would just push the canvas below the fold on phones —
    // writing every rep is the whole point of this mode, it must be reachable without scrolling.
    return (
      <div className="card rise" style={{ padding: "20px 20px 20px", textAlign: "center" }}>
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
          <span className="badge">
            <i className="ti ti-sparkles" aria-hidden="true" /> new
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 6 }}>
          <span className="jp" style={{ fontSize: 52, lineHeight: 1.15 }}>
            {kana.character}
          </span>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em" }}>{kana.romaji}</span>
          {speakerButton}
        </div>
        {editingMnemonic ? (
          mnemonicEditor
        ) : (
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 14 }}>
            {shownMnemonic}
            {mnemonicEditButton}
          </p>
        )}

        {writingDone ? (
          <>
            {practiceToggle}
            <button className="btn-primary" onClick={onLearned} style={{ minWidth: 160 }}>
              Got it, next
              <i className="ti ti-arrow-right" style={{ marginLeft: 6, verticalAlign: "-2px" }} aria-hidden="true" />
            </button>
          </>
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <p className="caption">Write it {REQUIRED_WRITES} times to lock it in</p>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: REQUIRED_WRITES }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: i < writeCount ? "var(--accent)" : "var(--border-strong)",
                    }}
                  />
                ))}
              </div>
            </div>
            <WritingCanvas key={canvasKey} guideChar={kana.character} />
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 14 }}>
              <button onClick={() => setCanvasKey((k) => k + 1)}>Clear</button>
              <button
                className="btn-primary"
                onClick={() => {
                  setWriteCount((c) => c + 1);
                  setCanvasKey((k) => k + 1);
                }}
              >
                Next rep
                <i
                  className="ti ti-arrow-right"
                  style={{ marginLeft: 6, verticalAlign: "-2px" }}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card rise" style={{ padding: "36px 24px 24px", textAlign: "center" }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
        <span className="badge badge-neutral">
          {direction === "toKana" ? <>{kana.script} &middot; recall</> : kana.script}
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
            {editingMnemonic ? (
              mnemonicEditor
            ) : (
              <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: isSpeakable ? 12 : 0 }}>
                {shownMnemonic}
                {mnemonicEditButton}
              </p>
            )}
            {speakerButton}
          </div>

          {practiceToggle}

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
      ) : (
        <button className="btn-primary" onClick={onReveal} style={{ minWidth: 160 }}>
          Show answer
        </button>
      )}
    </div>
  );
}
