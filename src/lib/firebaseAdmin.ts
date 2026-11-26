// Firebase Admin — SOLO para rutas de servidor (src/pages/api).
// Ignora las reglas de Firestore, así que nunca importar desde una página.
//
// Variable de entorno (Vercel + .env.local):
//   FIREBASE_SERVICE_ACCOUNT → contenido del JSON de la cuenta de servicio
//                              (Firebase Console → Configuración → Cuentas de servicio),
//                              tal cual o en base64. Secreta: NUNCA con prefijo NEXT_PUBLIC.
//
// OJO: NO importar 'firebase-admin/auth' ni 'firebase-admin/storage' acá.
// Arrastran paquetes ESM (jwks-rsa → jose) que en el Node del Vercel revientan
// con ERR_REQUIRE_ESM y tiran abajo TODA ruta que importe este archivo
// (incluido el webhook de Hotmart). Por eso el login se valida por la API REST
// y el link de Storage se firma acá mismo con el crypto nativo.
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { createHash, createSign } from 'crypto';

let app: App | null = null;

type ContaServico = { project_id: string; client_email: string; private_key: string };

function contaServico(): ContaServico | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  return JSON.parse(json);
}

export function adminDb(): Firestore | null {
  if (!app) {
    app = getApps()[0] || null;
    if (!app) {
      const sa = contaServico();
      if (!sa) return null;
      app = initializeApp({ credential: cert(sa as unknown as Parameters<typeof cert>[0]) });
    }
  }
  return getFirestore(app);
}

const enc = (x: string) =>
  encodeURIComponent(x).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

/**
 * Link temporal (firma V4 de Google Cloud Storage) para LEER un archivo del
 * bucket del proyecto, aunque esté en una carpeta que las reglas cierran.
 */
export function linkAssinado(caminho: string, segundos: number): string | null {
  const sa = contaServico();
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!sa || !bucket) return null;
  const host = 'storage.googleapis.com';
  const dt = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // 20261126T012345Z
  const escopo = `${dt.slice(0, 8)}/auto/storage/goog4_request`;
  const uri = '/' + [bucket, ...caminho.split('/')].map(enc).join('/');
  const params: [string, string][] = [
    ['X-Goog-Algorithm', 'GOOG4-RSA-SHA256'],
    ['X-Goog-Credential', `${sa.client_email}/${escopo}`],
    ['X-Goog-Date', dt],
    ['X-Goog-Expires', String(Math.min(604800, Math.max(1, Math.floor(segundos))))],
    ['X-Goog-SignedHeaders', 'host'],
  ];
  const query = params.map(([k, v]) => `${enc(k)}=${enc(v)}`).sort().join('&');
  const canonica = ['GET', uri, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const aFirmar = ['GOOG4-RSA-SHA256', dt, escopo, createHash('sha256').update(canonica).digest('hex')].join('\n');
  const firma = createSign('RSA-SHA256').update(aFirmar).sign(sa.private_key, 'hex');
  return `https://${host}${uri}?${query}&X-Goog-Signature=${firma}`;
}

/** Devuelve el uid dueño del token de login (o null si es inválido o venció). */
export async function verificarToken(idToken: string): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!idToken || !key) return null;
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.users?.[0]?.localId as string) || null;
  } catch {
    return null;
  }
}
