"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Estado que devuelven signIn/signUp a `useActionState`. */
export interface AuthState {
  error: string | null;
  /** Valores enviados, para repoblar el formulario (nunca la contraseña). */
  fields: { username?: string; email?: string };
}

const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const PASSWORD_MIN = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MSG = {
  credentials: "Correo o contraseña incorrectos.",
  missing: "Completa correo y contraseña.",
  username: `El usuario debe tener entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`,
  email: "Ingresa un correo válido.",
  password: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`,
  usernameTaken: "Ese usuario ya existe.",
  emailTaken: "Ese correo ya está registrado.",
  unconfirmed: "Cuenta creada, pero falta confirmar el correo.",
  generic: "No se pudo conectar. Intenta de nuevo.",
} as const;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Escapa los comodines de LIKE para comparar el username de forma literal. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = text(formData, "email").trim();
  const password = text(formData, "password");
  const fields = { email };

  if (!email || !password) return { error: MSG.missing, fields };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const invalid = error.code === "invalid_credentials" || error.code === "email_not_confirmed";
    return { error: invalid ? MSG.credentials : MSG.generic, fields };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const username = text(formData, "username").trim();
  const email = text(formData, "email").trim();
  const password = text(formData, "password");
  const fields = { username, email };

  // Validación en servidor: si falla, no se llama a signUp.
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return { error: MSG.username, fields };
  }
  if (!EMAIL_RE.test(email)) return { error: MSG.email, fields };
  if (password.length < PASSWORD_MIN) return { error: MSG.password, fields };

  const supabase = await createClient();

  // Disponibilidad sin distinguir mayúsculas. El índice único sobre
  // lower(username) es la garantía final si dos registros compiten.
  const { data: taken, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", escapeLike(username))
    .limit(1);

  if (lookupError) return { error: MSG.generic, fields };
  if (taken.length > 0) return { error: MSG.usernameTaken, fields };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { error: MSG.emailTaken, fields };
    }
    if (error.code === "weak_password") return { error: MSG.password, fields };
    if (error.code === "email_address_invalid") return { error: MSG.email, fields };
    // El trigger falló (carrera con el mismo username): Supabase devuelve
    // "Database error saving new user".
    if (error.message.includes("Database error saving new user")) {
      return { error: MSG.usernameTaken, fields };
    }
    return { error: MSG.generic, fields };
  }

  // Sin sesión = "Confirm email" sigue activo en el dashboard (paso 9).
  if (!data.session) return { error: MSG.unconfirmed, fields };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
