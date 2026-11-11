import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  // Con sesión activa no tiene sentido ver el login.
  if (user && request.nextUrl.pathname === "/login") {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    // Conservar las cookies de sesión recién refrescadas.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    // Todo salvo assets estáticos, optimización de imágenes, favicon e imágenes.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
