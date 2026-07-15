"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

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

      <h1 style={{ marginBottom: 6 }}>Welcome to kotoba</h1>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 24 }}>
        Sign in with Google to continue.
      </p>
      <button
        onClick={signInWithGoogle}
        className="btn-primary"
        style={{ height: 44, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <i className="ti ti-brand-google" aria-hidden="true" />
        Continue with Google
      </button>
      {error && (
        <p style={{ color: "var(--red-500)", fontSize: 13, marginTop: 12 }}>{error}</p>
      )}
    </div>
  );
}
