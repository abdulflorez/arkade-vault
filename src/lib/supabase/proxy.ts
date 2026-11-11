import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";

/**
 * Refresca la sesión de Supabase y reescribe las cookies de auth en la
 * petición (para los Server Components) y en la respuesta (para el navegador).
 * Devuelve la respuesta a usar y el usuario autenticado, si lo hay.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Evita que una CDN cachee una respuesta con el token de otro usuario.
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // No meter lógica entre createServerClient y getUser: getUser es quien
  // valida el token contra Supabase y dispara el refresco de cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
