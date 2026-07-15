"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const LINKS = [
  { href: "/", label: "dashboard" },
  { href: "/review", label: "review" },
  { href: "/kana", label: "kana" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "14px 24px",
        borderBottom: "1px solid var(--border)",
        background: "color-mix(in srgb, var(--background) 82%, transparent)",
        backdropFilter: "saturate(1.4) blur(12px)",
        WebkitBackdropFilter: "saturate(1.4) blur(12px)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span
            aria-hidden="true"
            className="jp"
            style={{
              display: "grid",
              placeItems: "center",
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "var(--accent)",
              color: "var(--on-accent)",
              fontSize: 17,
              paddingTop: 2,
            }}
          >
            こ
          </span>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>kotoba</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-pill)",
                  color: active ? "var(--accent-text)" : "var(--text-secondary)",
                  background: active ? "var(--accent-bg)" : "transparent",
                  transition: "color 0.15s, background 0.15s",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      {email ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="caption" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {email}
          </span>
          <button onClick={() => supabase.auth.signOut()}>sign out</button>
        </div>
      ) : (
        <Link href="/login">
          <span className="btn btn-primary">sign in</span>
        </Link>
      )}
    </nav>
  );
}
