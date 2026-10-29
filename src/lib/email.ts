// Envía el recibo de comisión llamando a la API route /api/enviar-recibo (que usa Brevo).
// Si Brevo no está configurado en el servidor, la API devuelve { ok:false, reason:'no-config' }.

interface ReciboParams {
  to_email: string;
  afiliado_nombre: string;
  monto: string;
  cantidad_referidos: string;
  fecha: string;
  banco: string;
  nro_cuenta: string;
  recibo_id: string;
}

export async function enviarReciboComision(params: ReciboParams): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch('/api/enviar-recibo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    return { ok: !!data.ok, reason: data.reason };
  } catch (err) {
    console.error('enviarRecibo', err);
    return { ok: false, reason: 'error' };
  }
}
