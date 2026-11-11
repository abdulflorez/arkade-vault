import type { Metadata } from "next";
import { Press_Start_2P, JetBrains_Mono, Courier_Prime } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import type { Session } from "@/lib/session-context";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

/** Usuario de Supabase + su username de public.profiles, leídos en el servidor. */
async function getSessionUser(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  // Respaldo por si el perfil aún no es visible: el username enviado en signUp.
  const name = profile?.username ?? (user.user_metadata.username as string | undefined);
  return name ? { name } : null;
}

const pixelFont = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Juega online y compite por la mayor puntuación en Arcade Vault.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();

  return (
    <html
      lang="es"
      className={`${pixelFont.variable} ${jetbrainsMono.variable} ${courierPrime.variable}`}
    >
      <body>
        <div className="av-bg" />
        <div className="av-noise" />
        <div id="root">
          <AppShell user={user}>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}
