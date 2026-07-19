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
        flexShrink: 0,
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

  // Text + pencil as one flex row: the icon stays vertically centered against
  // the text block and can never wrap onto its own line the way an inline box
  // after a full line of text does.
  const mnemonicRow = editingMnemonic ? (
    mnemonicEditor
  ) : (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, marginBottom: 14 }}>
      <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{shownMnemonic}</p>
      {mnemonicEditButton}
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

  // Deliberately quiet: this is toggled rarely (the choice is remembered), so it
  // shouldn't compete visually with grading.
  const practiceToggle = showOptionalPractice && (
    <div>
      <button
        onClick={togglePracticeWriting}
        style={{
          fontSize: 12.5,
          padding: "5px 12px",
          border: "none",
          background: "transparent",
          boxShadow: "none",
          color: "var(--text-muted)",
        }}
      >
        <i className="ti ti-pencil" style={{ marginRight: 6, verticalAlign: "-2px" }} aria-hidden="true" />
        {practiceWriting ? "Hide writing practice" : "Writing practice"}
      </button>
      {practiceWriting && (
        <div style={{ marginTop: 10 }}>
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
        {mnemonicRow}

        {writingDone ? (
          <>
            <div style={{ marginBottom: 14 }}>{practiceToggle}</div>
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
    <div className="card rise" style={{ padding: showAnswer ? "20px" : "36px 24px 24px", textAlign: "center" }}>
      {/* Direction only — the script/row/practice context already lives in the
          page caption above the card; repeating "hiragana" here was noise. */}
      <div style={{ marginBottom: showAnswer ? 12 : 20, display: "flex", justifyContent: "center" }}>
        <span className="badge badge-neutral">{direction === "toKana" ? "recall" : "recognize"}</span>
      </div>

      {!showAnswer ? (
        <>
          {promptIsKana ? (
            <div className="jp" style={{ fontSize: 96, marginBottom: 28 }}>
              {kana.character}
            </div>
          ) : (
            <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 28 }}>
              {kana.romaji}
            </div>
          )}
          <button className="btn-primary" onClick={onReveal} style={{ minWidth: 160 }}>
            Show answer
          </button>
        </>
      ) : (
        <>
          {/* Revealed: both sides are known now, so the big prompt + divider +
              big answer collapse into one compact row — grading stays on screen
              even with the writing pad open. Same reasoning as learn mode. */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 6 }}>
            <span className="jp" style={{ fontSize: 48, lineHeight: 1.15 }}>
              {kana.character}
            </span>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>{kana.romaji}</span>
            {speakerButton}
          </div>
          {mnemonicRow}

          {progressHint && <p className="caption">{progressHint}</p>}

          {showOptionalPractice && (
            <div style={{ marginTop: 14, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
              {practiceToggle}
            </div>
          )}

          {/* Grading is the required action on every card, so it lives in a bar
              that sticks to the viewport bottom — always visible AND in thumb
              reach, no matter how tall the writing pad above it is. */}
          <div
            style={{
              position: "sticky",
              bottom: 12,
              zIndex: 5,
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
              padding: 10,
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <button
              onClick={() => onGrade(false)}
              style={{
                padding: "12px",
                background: "color-mix(in srgb, var(--red-500) 10%, var(--surface-2))",
                borderColor: "color-mix(in srgb, var(--red-500) 30%, transparent)",
              }}
            >
              <i className="ti ti-x" style={{ marginRight: 7, color: "var(--red-500)" }} aria-hidden="true" />
              Missed it
            </button>
            <button
              onClick={() => onGrade(true)}
              style={{
                padding: "12px",
                background: "color-mix(in srgb, var(--teal-400) 10%, var(--surface-2))",
                borderColor: "color-mix(in srgb, var(--teal-400) 30%, transparent)",
              }}
            >
              <i className="ti ti-check" style={{ marginRight: 7, color: "var(--teal-400)" }} aria-hidden="true" />
              Got it
            </button>
          </div>
        </>
      )}
    </div>
  );
}
