import type { NextApiRequest, NextApiResponse } from 'next';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';

// Webhook de Hotmart (versión 2.0.0): libera el acceso apenas se aprueba
// el pago con tarjeta, sin pasar por el admin.
//
// Se configura en Hotmart → Herramientas → Webhook, con la URL
//   https://mayorista-brasil.vercel.app/api/hotmart-webhook
// Variables de entorno (Vercel + .env.local):
//   HOTMART_HOTTOK            → token que muestra Hotmart en esa pantalla (secreto)
//   FIREBASE_SERVICE_ACCOUNT  → ver src/lib/firebaseAdmin.ts
//
// Cómo se encuentra al usuario: el link de pago del popup lleva `sck=<uid>`
// (PaywallModal) y Hotmart lo devuelve en data.purchase.origin.sck. Si no
// viene, se busca por el email del comprador. Si tampoco aparece, se avisa
// al admin por email para que libere a mano.
//
// Cada evento queda registrado en `pagosHotmart/{transacción}` (solo visible
// desde la consola de Firebase; no hace falta tocar las reglas).

const LIBERAN = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'];
const REVOCAN = ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK'];

const PRECIO_GS = Number(process.env.NEXT_PUBLIC_PRECIO_GS || 89000);
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'contingenciamc1@gmail.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const HOTTOK = process.env.HOTMART_HOTTOK;
  const db = adminDb();
  // 500 a propósito: Hotmart reintenta, así no se pierde la venta mientras falta configurar
  if (!HOTTOK || !db) return res.status(500).json({ ok: false, error: 'no-config' });

  const b = req.body || {};
  const hottok = req.headers['x-hotmart-hottok'] || b.hottok;
  if (hottok !== HOTTOK) return res.status(401).json({ ok: false, error: 'hottok' });

  const evento: string = b.event || '';
  const compra = b.data?.purchase || {};
  const comprador = b.data?.buyer || {};
  const transaccion: string = compra.transaction || b.id || '';
  const email: string = (comprador.email || '').trim().toLowerCase();
  const sck: string = compra.origin?.sck || '';

  // ---- Encontrar al usuario ----
  let uid: string | null = null;
  if (sck) {
    const snap = await db.collection('usuarios').doc(sck).get();
    if (snap.exists) uid = sck;
  }
  if (!uid && email) {
    const q = await db.collection('usuarios').where('email', '==', email).limit(1).get();
    if (!q.empty) uid = q.docs[0].id;
  }

  let accion = 'ignorado';
  if (uid && LIBERAN.includes(evento)) {
    const ref = db.collection('usuarios').doc(uid);
    const actual = (await ref.get()).data() || {};
    // Idempotente: un reenvío del mismo evento no cambia la fecha de compra
    if (!actual.pago) {
      await ref.update({
        pago: true,
        fechaCompra: FieldValue.serverTimestamp(),
        montoPagado: PRECIO_GS,
        pagoPendiente: false,
        pagoMetodo: 'hotmart',
        hotmartTransaccion: transaccion,
      });
      accion = 'liberado';
    } else {
      accion = 'ya-pagado';
    }
  } else if (uid && REVOCAN.includes(evento)) {
    await db.collection('usuarios').doc(uid).update({ pago: false, montoPagado: 0 });
    accion = 'revocado';
  } else if (!uid && LIBERAN.includes(evento)) {
    accion = 'sin-usuario';
  }

  if (transaccion) {
    await db.collection('pagosHotmart').doc(transaccion).set({
      evento, email, sck, uid, accion,
      nombre: comprador.name || '',
      recibido: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  if (accion === 'liberado' || accion === 'sin-usuario' || accion === 'revocado') {
    await avisarAdmin(accion, email, comprador.name || '', transaccion);
  }

  return res.status(200).json({ ok: true, accion });
}

async function avisarAdmin(accion: string, email: string, nombre: string, transaccion: string) {
  const API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
  if (!API_KEY || !SENDER_EMAIL) return;

  const titulos: Record<string, string> = {
    'liberado': 'Venta con tarjeta — acceso liberado',
    'sin-usuario': 'Venta con tarjeta SIN usuario — liberar a mano',
    'revocado': 'Reembolso/contracargo — acceso revocado',
  };
  const detalle = accion === 'sin-usuario'
    ? 'Hotmart aprobó un pago pero no encontré ninguna cuenta con este email. Buscá a la persona en /admin/usuarios y liberala a mano.'
    : '';

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: process.env.BREVO_SENDER_NAME || 'Mayorista Brasil', email: SENDER_EMAIL },
        to: [{ email: ADMIN_EMAIL }],
        subject: titulos[accion],
        htmlContent: `<p><strong>${titulos[accion]}</strong></p>
          <p>Comprador: ${nombre || '—'} (${email || 'sin email'})<br>Transacción Hotmart: ${transaccion || '—'}</p>
          <p>${detalle}</p>`,
      }),
    });
  } catch (err) {
    console.error('aviso admin hotmart', err);
  }
}
