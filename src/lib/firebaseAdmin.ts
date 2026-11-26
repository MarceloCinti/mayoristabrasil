// Firebase Admin — SOLO para rutas de servidor (src/pages/api).
// Ignora las reglas de Firestore, así que nunca importar desde una página.
//
// Variable de entorno (Vercel + .env.local):
//   FIREBASE_SERVICE_ACCOUNT → contenido del JSON de la cuenta de servicio
//                              (Firebase Console → Configuración → Cuentas de servicio),
//                              tal cual o en base64. Secreta: NUNCA con prefijo NEXT_PUBLIC.
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | null = null;

export function adminDb(): Firestore | null {
  if (!app) {
    app = getApps()[0] || null;
    if (!app) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) return null;
      const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
      app = initializeApp({ credential: cert(JSON.parse(json)) });
    }
  }
  return getFirestore(app);
}

// Storage (bucket do projeto) e Auth — usados pela rota do curso para
// conferir quem pede o vídeo e gerar um link temporário assinado.
import { getStorage } from 'firebase-admin/storage';
import { getAuth, Auth } from 'firebase-admin/auth';

export function adminBucket() {
  if (!adminDb() || !app) return null;
  return getStorage(app).bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
}

export function adminAuth(): Auth | null {
  if (!adminDb() || !app) return null;
  return getAuth(app);
}
