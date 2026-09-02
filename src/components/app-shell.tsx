"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/lib/session-context";
import { Nav } from "@/components/nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Nav />
      <main className="av-main">{children}</main>
      <footer
        style={{
          borderTop: "1px solid var(--line)",
          padding: "20px 32px",
          textAlign: "center",
          color: "var(--ink-faint)",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.16em",
        }}
      >
        © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
      </footer>
    </SessionProvider>
  );
}
