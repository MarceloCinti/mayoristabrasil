import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb, linkAssinado, verificarToken } from '@/lib/firebaseAdmin';
import { tieneAcceso } from '@/lib/trial';
import { TODAS_CLASES } from '@/lib/curso';

/**
 * Entrega el video de una clase del curso (Bono 3) SOLO a quien tiene acceso.
 *
 * Los videos están en Storage bajo `curso/…`, carpeta que las reglas dejan
 * cerrada para lectura: no existe un link público permanente. Esta ruta:
 *   1. confirma quién es (token de Firebase Auth),
 *   2. confirma que pagó / es admin / está en prueba,
 *   3. devuelve un link firmado que vence en 2 horas.
 * Si el link vence en medio de la clase, el reproductor pide otro solo.
 */
const DURACION_LINK_MS = 2 * 60 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'método' });

  const db = adminDb();
  if (!db) return res.status(500).json({ error: 'servidor sin configurar' });

  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const uid = await verificarToken(token);
  if (!uid) return res.status(401).json({ error: 'sesión inválida' });

  const clase = String(req.body?.clase || '');
  if (!TODAS_CLASES.some(c => c.id === clase)) return res.status(400).json({ error: 'clase' });

  const usuario = (await db.doc(`usuarios/${uid}`).get()).data();
  if (!usuario || (usuario.archivado && !usuario.esAdmin) || !tieneAcceso(usuario)) {
    return res.status(403).json({ error: 'sin acceso' });
  }

  const videos = ((await db.doc('contenido/curso').get()).data()?.videos || {}) as Record<string, string>;
  const ruta = videos[clase];
  if (!ruta || !ruta.startsWith('curso/')) return res.status(404).json({ error: 'sin video' });

  const expira = Date.now() + DURACION_LINK_MS;
  const url = linkAssinado(ruta, DURACION_LINK_MS / 1000);
  if (!url) return res.status(500).json({ error: 'no se pudo generar el link' });
  return res.status(200).json({ url, expira });
}
