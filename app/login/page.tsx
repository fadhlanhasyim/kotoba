"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

// Fixed positions/sizes (no randomness) so server and client render identically.
const GLYPHS: { char: string; top: string; left: string; size: number; tilt: number; delay: number }[] = [
  { char: "あ", top: "6%", left: "4%", size: 84, tilt: -8, delay: 0 },
  { char: "ネ", top: "14%", left: "78%", size: 64, tilt: 10, delay: 1.2 },
  { char: "ん", top: "58%", left: "2%", size: 72, tilt: 6, delay: 2.1 },
  { char: "カ", top: "74%", left: "84%", size: 88, tilt: -6, delay: 0.6 },
  { char: "き", top: "82%", left: "12%", size: 56, tilt: 12, delay: 1.7 },
  { char: "ヨ", top: "34%", left: "90%", size: 52, tilt: -12, delay: 2.6 },
  { char: "つ", top: "2%", left: "46%", size: 58, tilt: 4, delay: 0.9 },
];

const FEATURES: { icon: string; color: string; text: string }[] = [
  { icon: "ti-language-hiragana", color: "var(--coral-400)", text: "Kana drills with real handwriting practice" },
  { icon: "ti-cards", color: "var(--blue-500)", text: "Spaced-repetition vocab that respects your memory" },
  { icon: "ti-compass", color: "var(--teal-400)", text: "A learning path that always knows your next step" },
];

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "min(calc(100dvh - 180px), 720px)",
        display: "grid",
        placeItems: "center",
      }}
    >
      {GLYPHS.map((g) => (
        <span
          key={g.char}
          aria-hidden="true"
          className="jp login-glyph"
          style={
            {
              top: g.top,
              left: g.left,
              fontSize: g.size,
              animationDelay: `${g.delay}s`,
              "--tilt": `${g.tilt}deg`,
            } as React.CSSProperties
          }
        >
          {g.char}
        </span>
      ))}

      {/* Soft accent glow behind the card */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="card rise login-card"
        style={{ position: "relative", maxWidth: 420, width: "100%", padding: "36px 28px", textAlign: "center" }}
      >
        <span
          aria-hidden="true"
          className="jp"
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 52,
            height: 52,
            borderRadius: 15,
            background: "var(--accent)",
            color: "var(--on-accent)",
            fontSize: 28,
            marginBottom: 16,
            paddingTop: 3,
            boxShadow: "var(--shadow-md)",
          }}
        >
          こ
        </span>

        <p className="caption jp" style={{ marginBottom: 4, letterSpacing: "0.12em" }}>
          ようこそ
        </p>
        <h1 style={{ marginBottom: 8 }}>Welcome to kotoba</h1>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 24 }}>
          <span className="jp">言葉</span>
          {" means “words.” Start collecting yours — a few minutes a day, all the way to JLPT N5."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 26, textAlign: "left" }}>
          {FEATURES.map((f) => (
            <div key={f.icon} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                aria-hidden="true"
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${f.color} 14%, transparent)`,
                  color: f.color,
                  fontSize: 17,
                }}
              >
                <i className={`ti ${f.icon}`} />
              </span>
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{f.text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={signInWithGoogle}
          className="btn-primary"
          style={{ height: 46, width: "100%", gap: 8 }}
        >
          <i className="ti ti-brand-google" aria-hidden="true" />
          Continue with Google
        </button>
        <p className="caption" style={{ marginTop: 12 }}>
          Free — your progress syncs to your account.
        </p>
        {error && <p style={{ color: "var(--red-500)", fontSize: 13, marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}
