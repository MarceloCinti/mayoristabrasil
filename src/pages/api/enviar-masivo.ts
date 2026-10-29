import type { NextApiRequest, NextApiResponse } from 'next';

// Envía un email a una lista de destinatarios usando Brevo.
// body: { recipients: [{email, nombre}], asunto, mensaje }

interface Recipient { email: string; nombre?: string; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
  const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Mayorista Brasil';
  if (!API_KEY || !SENDER_EMAIL) return res.status(200).json({ ok: false, reason: 'no-config' });

  const { recipients, asunto, mensaje } = req.body as { recipients: Recipient[]; asunto: string; mensaje: string };
  if (!Array.isArray(recipients) || recipients.length === 0) return res.status(400).json({ ok: false, error: 'recipients' });
  if (!asunto || !mensaje) return res.status(400).json({ ok: false, error: 'content' });

  // Convierte saltos de línea en <br> y arma el cuerpo branded
  const cuerpo = mensaje.replace(/\n/g, '<br>');
  const html = (nombre: string) => `
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:#0E1525;border-radius:16px;overflow:hidden;border:1px solid #1f2a40">
    <div style="background:linear-gradient(135deg,#3B82F6,#22D3EE);padding:22px 28px;color:#fff;font-size:20px;font-weight:800;letter-spacing:-.5px">Mayorista Brasil</div>
    <div style="padding:28px;color:#F8FAFC;font-size:15px;line-height:1.65">
      ${nombre ? `<p style="margin:0 0 14px">Hola ${nombre},</p>` : ''}
      <div style="color:#cbd5e1">${cuerpo}</div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #1f2a40;color:#64748b;font-size:12px;text-align:center">Mayorista Brasil</div>
  </div>`;

  let sent = 0, failed = 0;
  let errorEjemplo = ''; // primer error de Brevo, para mostrarlo en el admin
  // Envía en lotes de 20 en paralelo
  const lote = 20;
  for (let i = 0; i < recipients.length; i += lote) {
    const grupo = recipients.slice(i, i + lote);
    const resultados = await Promise.all(grupo.map(async (r) => {
      if (!r.email) return false;
      try {
        const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            sender: { name: SENDER_NAME, email: SENDER_EMAIL },
            to: [{ email: r.email, name: r.nombre || '' }],
            subject: asunto,
            htmlContent: html(r.nombre || ''),
          }),
        });
        if (!resp.ok) {
          // Captura el motivo real que devuelve Brevo (IP no autorizada, sender no válido, etc.)
          const detalle = await resp.text().catch(() => '');
          console.error('Brevo error', resp.status, detalle);
          if (!errorEjemplo) {
            let msg = detalle;
            try { msg = JSON.parse(detalle)?.message || detalle; } catch { /* noop */ }
            errorEjemplo = `${resp.status}: ${msg}`.slice(0, 300);
          }
        }
        return resp.ok;
      } catch (e: any) {
        if (!errorEjemplo) errorEjemplo = String(e?.message || e).slice(0, 300);
        return false;
      }
    }));
    resultados.forEach(ok => ok ? sent++ : failed++);
  }

  return res.status(200).json({ ok: true, sent, failed, error: errorEjemplo || undefined });
}
