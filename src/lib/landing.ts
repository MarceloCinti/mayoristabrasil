import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface Testimonio {
  nombre: string;
  ciudad: string;
  texto: string;
}

export interface LandingConfig {
  // Hero
  heroTitle: string;
  heroSubtitle: string;
  heroVideoDesktop: string; // 16:9
  heroVideoMobile: string;  // 9:16
  heroBadgeTopLabel: string;
  heroBadgeTopValue: string;
  heroBadgeBottomLabel: string;
  heroBadgeBottomValue: string;
  // Sección demo
  videoTour: string; // imagen o video del tour
  // Prueba social
  proofShots: string[]; // hasta 4 imágenes (prints / fotos)
  testimonios: Testimonio[];
}

export const DEFAULT_LANDING: LandingConfig = {
  heroTitle: '',
  heroSubtitle: '',
  heroVideoDesktop: '',
  heroVideoMobile: '',
  heroBadgeTopLabel: 'Compraste',
  heroBadgeTopValue: 'R$ 40',
  heroBadgeBottomLabel: 'Vendés en PY',
  heroBadgeBottomValue: 'Gs. 180.000',
  videoTour: '',
  proofShots: ['', '', '', ''],
  testimonios: [
    { nombre: 'María G.', ciudad: 'Asunción', texto: 'Recuperé la inversión en la primera compra. Encontré proveedores que jamás hubiera encontrado sola.' },
    { nombre: 'Carlos R.', ciudad: 'Ciudad del Este', texto: 'Mejores proveedores que los grupos de Facebook. El mapa del Brás me ahorró horas.' },
    { nombre: 'Lorena M.', ciudad: 'Encarnación', texto: 'Lo mejor fue evitar proveedores falsos. Compro más barato y vendo más.' },
  ],
};

export const LANDING_DOC = { col: 'config', id: 'landing' };

export function mergeLanding(data: Partial<LandingConfig> | undefined): LandingConfig {
  if (!data) return DEFAULT_LANDING;
  return {
    ...DEFAULT_LANDING,
    ...data,
    proofShots: data.proofShots && data.proofShots.length ? data.proofShots : DEFAULT_LANDING.proofShots,
    testimonios: data.testimonios && data.testimonios.length ? data.testimonios : DEFAULT_LANDING.testimonios,
  };
}

export function useLandingConfig() {
  const [config, setConfig] = useState<LandingConfig>(DEFAULT_LANDING);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, LANDING_DOC.col, LANDING_DOC.id));
        if (active && snap.exists()) setConfig(mergeLanding(snap.data() as Partial<LandingConfig>));
      } catch (err) {
        console.error('landing config', err);
      }
      if (active) setLoaded(true);
    })();
    return () => { active = false; };
  }, []);

  return { config, loaded };
}
