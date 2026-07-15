"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="card rise" style={{ maxWidth: 400, margin: "40px auto 0", padding: "36px 28px", textAlign: "center" }}>
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
          marginBottom: 18,
          paddingTop: 3,
        }}
      >
        こ
      </span>

      {sent ? (
        <>
          <h1 style={{ marginBottom: 10 }}>Check your inbox</h1>
          <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
            We sent a sign-in link to <strong style={{ color: "var(--foreground)" }}>{email}</strong>. Open it to
            continue.
          </p>
        </>
      ) : (
        <>
          <h1 style={{ marginBottom: 6 }}>Welcome to kotoba</h1>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 24 }}>
            Sign in with your email — no password needed.
          </p>
          <form onSubmit={sendMagicLink} style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" style={{ height: 44 }}>
              Send magic link
            </button>
            {error && <p style={{ color: "var(--red-500)", fontSize: 13 }}>{error}</p>}
          </form>
        </>
      )}
    </div>
  );
}
