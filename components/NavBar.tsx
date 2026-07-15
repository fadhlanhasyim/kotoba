"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const LINKS = [
  { href: "/", label: "dashboard", icon: "ti-layout-dashboard" },
  { href: "/review", label: "review", icon: "ti-cards" },
  { href: "/kana", label: "kana", icon: "ti-language-hiragana" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        background: "color-mix(in srgb, var(--background) 82%, transparent)",
        backdropFilter: "saturate(1.4) blur(12px)",
        WebkitBackdropFilter: "saturate(1.4) blur(12px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
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
          <span className="brand-name" style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>
            kotoba
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link"
                style={{
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--accent-text)" : "var(--text-secondary)",
                  background: active ? "var(--accent-bg)" : "transparent",
                }}
              >
                <i className={`ti ${link.icon}`} aria-hidden="true" />
                <span className="nav-label">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {email ? (
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
            style={{
              display: "grid",
              placeItems: "center",
              width: 36,
              height: 36,
              padding: 0,
              borderRadius: "50%",
              fontWeight: 600,
              fontSize: 14,
              background: "var(--accent-bg)",
              color: "var(--accent-text)",
              border: menuOpen ? "1px solid var(--accent)" : "1px solid transparent",
            }}
          >
            {email[0]?.toUpperCase()}
          </button>
          {menuOpen && (
            <div
              className="card rise"
              style={{
                position: "absolute",
                right: 0,
                top: 46,
                minWidth: 220,
                padding: 12,
                zIndex: 20,
              }}
            >
              <p
                className="caption"
                style={{ padding: "0 4px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {email}
              </p>
              <button
                onClick={() => supabase.auth.signOut()}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start" }}
              >
                <i className="ti ti-logout" aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link href="/login" style={{ flexShrink: 0 }}>
          <span className="btn btn-primary">Sign in</span>
        </Link>
      )}
    </nav>
  );
}
