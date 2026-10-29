import type { NextApiRequest, NextApiResponse } from 'next';

// Envía el recibo de comisión por email usando Brevo (https://www.brevo.com).
// Variables de entorno (en Vercel + .env.local):
//   BREVO_API_KEY        → API key de Brevo (secreta, NO usar NEXT_PUBLIC)
//   BREVO_SENDER_EMAIL   → email remitente verificado en Brevo
//   BREVO_SENDER_NAME    → nombre que se muestra como remitente

interface Body {
  to_email: string;
  afiliado_nombre: string;
  monto: string;
  cantidad_referidos: string;
  fecha: string;
  banco: string;
  nro_cuenta: string;
  recibo_id: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
  const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Mayorista Brasil';
  if (!API_KEY || !SENDER_EMAIL) {
    return res.status(200).json({ ok: false, reason: 'no-config' });
  }

  const b = req.body as Body;
  if (!b?.to_email) return res.status(400).json({ ok: false, error: 'to_email' });

  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:#0E1525;border-radius:16px;overflow:hidden;border:1px solid #1f2a40">
    <div style="background:linear-gradient(135deg,#3B82F6,#22D3EE);padding:24px 28px">
      <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-.5px">Mayorista Brasil</div>
      <div style="color:rgba(255,255,255,.85);font-size:13px;margin-top:2px">Comprobante de pago de comisiones</div>
    </div>
    <div style="padding:28px">
      <p style="color:#F8FAFC;font-size:15px;margin:0 0 6px">Hola ${b.afiliado_nombre},</p>
      <p style="color:#94A3B8;font-size:14px;line-height:1.6;margin:0 0 22px">
        Confirmamos el pago de tus comisiones. Este es tu recibo:
      </p>
      <div style="background:#121B2E;border:1px solid #1f2a40;border-radius:12px;padding:20px">
        <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid #1f2a40">
          <div style="color:#94A3B8;font-size:12px;text-transform:uppercase;letter-spacing:1px">Monto pagado</div>
          <div style="color:#10B981;font-size:32px;font-weight:800;margin-top:4px">${b.monto}</div>
        </div>
        <table style="width:100%;margin-top:16px;border-collapse:collapse">
          ${row('N° de recibo', b.recibo_id)}
          ${row('Indicaciones', b.cantidad_referidos)}
          ${row('Fecha', b.fecha)}
          ${row('Banco', b.banco)}
          ${row('N° de cuenta', b.nro_cuenta)}
        </table>
      </div>
      <p style="color:#94A3B8;font-size:13px;line-height:1.6;margin:22px 0 0">
        ¡Gracias por ser parte de Mayorista Brasil! Seguí compartiendo tu link para sumar más comisiones.
      </p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #1f2a40;color:#64748b;font-size:12px;text-align:center">
      Mayorista Brasil · Este es un comprobante automático.
    </div>
  </div>`;

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: b.to_email, name: b.afiliado_nombre }],
        subject: `Recibo de pago ${b.recibo_id} — Mayorista Brasil`,
        htmlContent: html,
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error('brevo', r.status, txt);
      return res.status(200).json({ ok: false, reason: `brevo-${r.status}` });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('brevo error', err);
    return res.status(200).json({ ok: false, reason: 'error' });
  }
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:#94A3B8;font-size:13px">${label}</td>
    <td style="padding:8px 0;color:#F8FAFC;font-size:13px;font-weight:600;text-align:right">${value || '—'}</td>
  </tr>`;
}
