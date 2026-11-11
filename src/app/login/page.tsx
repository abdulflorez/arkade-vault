"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { signIn, signUp, type AuthState } from "./actions";

const initialState: AuthState = { error: null, fields: {} };

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"in" | "up">("in");
  // Controlados para conservar lo escrito al fallar o al cambiar de pestaña.
  // La contraseña no: React resetea el campo tras cada envío.
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState);

  const isSignIn = tab === "in";
  const state = isSignIn ? signInState : signUpState;
  const pending = isSignIn ? signInPending : signUpPending;

  // Reinicia la animación .shake con cada error nuevo (aunque el texto se repita).
  // Solo la primera vez que aparece cada error: cambiar de pestaña no sacude.
  const formRef = useRef<HTMLFormElement>(null);
  const shaken = useRef(new WeakSet<AuthState>());
  useEffect(() => {
    const form = formRef.current;
    if (!form || !state.error || shaken.current.has(state)) return;
    shaken.current.add(state);
    form.classList.remove("shake");
    void form.offsetWidth; // fuerza reflow para que la animación vuelva a correr
    form.classList.add("shake");
    const t = setTimeout(() => form.classList.remove("shake"), 400);
    return () => clearTimeout(t);
  }, [state]);

  const playAsGuest = () => {
    router.push("/");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button className={isSignIn ? "on" : ""} onClick={() => setTab("in")}>
            INICIAR SESIÓN
          </button>
          <button className={!isSignIn ? "on" : ""} onClick={() => setTab("up")}>
            CREAR CUENTA
          </button>
        </div>

        <form ref={formRef} action={isSignIn ? signInAction : signUpAction}>
          {!isSignIn && (
            <div className="field">
              <label htmlFor="username">Usuario</label>
              <input
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="px_kai"
                autoComplete="username"
              />
            </div>
          )}
          <div className={"field" + (isSignIn ? "" : " slide-in")}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete={isSignIn ? "current-password" : "new-password"}
            />
          </div>

          {state.error && (
            <div className="form-error" role="alert">
              {state.error}
            </div>
          )}

          <button
            className="btn lg"
            type="submit"
            disabled={pending}
            style={{ width: "100%", marginTop: 8 }}
          >
            {pending ? "CONECTANDO..." : isSignIn ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
          </button>
        </form>

        <button
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={playAsGuest}
        >
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button">
            ◆ GOOGLE
          </button>
          <button className="btn ghost" type="button">
            ▣ GITHUB
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
