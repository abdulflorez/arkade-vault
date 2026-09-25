import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<ContactPayload> | null;

  const name = body?.name?.trim() ?? "";
  const email = body?.email?.trim() ?? "";
  const message = body?.message?.trim() ?? "";

  if (!name || !email || !message) {
    return Response.json(
      { error: "Nombre, correo y mensaje son obligatorios." },
      { status: 400 }
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return Response.json(
      { error: "El correo electrónico no tiene un formato válido." },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.CONTACT_TO_EMAIL;

  if (!to) {
    return Response.json(
      { error: "El destinatario de contacto no está configurado." },
      { status: 500 }
    );
  }

  const { error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    replyTo: email,
    subject: `Nuevo mensaje de contacto — ${name}`,
    text: `Nombre: ${name}\nCorreo: ${email}\n\n${message}`,
  });

  if (error) {
    return Response.json(
      { error: "No se pudo enviar el mensaje. Intenta de nuevo más tarde." },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
