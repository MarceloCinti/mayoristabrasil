import Head from 'next/head';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { FaGift, FaDownload, FaExternalLinkAlt, FaArrowRight } from 'react-icons/fa';
import { db } from '@/lib/firebase';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './bonos.module.css';

interface Bono {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string;
  enlace?: string;
  archivo?: string;
}

// Bonos 2 y 3 viven dentro de la plataforma: su título, texto y destino
// mandan sobre lo que haya en Firestore (colección bonos).
const BONOS_INTERNOS: Record<number, { titulo: string; descripcion: string; href: string; cta: string }> = {
  2: {
    titulo: 'Diccionario del Negociador',
    descripcion: 'Más de 200 mensajes en portugués, por rubro, del primer «hola» hasta el envío. Busque en español y copie con un clic para WhatsApp o Instagram.',
    href: '/dashboard/mensajes',
    cta: 'Abrir diccionario',
  },
  3: {
    titulo: 'Academia Mayorista: de cero a su primera venta',
    descripcion: 'Mini curso en video: desde que activa su acceso hasta que la mercadería llega a su casa y la vende en Marketplace, Instagram o en su casa.',
    href: '/dashboard/curso',
    cta: 'Empezar el curso',
  },
};

const BONOS_PADRAO: Bono[] = [
  { id: 'b1', numero: 1, titulo: '50 proveedores con envío directo por WhatsApp', descripcion: 'Lista premium de contactos que despachan directamente al Paraguay sin intermediarios.' },
  { id: 'b2', numero: 2, titulo: 'Diccionario del Negociador', descripcion: '' },
  { id: 'b3', numero: 3, titulo: 'Academia Mayorista', descripcion: '' },
  { id: 'b4', numero: 4, titulo: 'Calendario de las mejores épocas para comprar', descripcion: 'Cuándo viajar, cuándo hacer pedidos online, cuáles son las mejores temporadas de descuento.' },
];

export default function Bonos() {
  const { authorized, loading: guardLoading } = usePagoGuard();
  const [bonos, setBonos] = useState<Bono[]>(BONOS_PADRAO);

  useEffect(() => {
    if (!authorized) return;
    const fetch = async () => {
      try {
        const q = query(collection(db, 'bonos'), orderBy('numero'));
        const snap = await getDocs(q);
        if (snap.size > 0) {
          setBonos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bono)));
        }
      } catch (err) { console.error(err); }
    };
    fetch();
  }, [authorized]);

  if (guardLoading || !authorized) return null;

  return (
    <DashboardLayout>
      <Head><title>Bonos — Mayorista Brasil</title></Head>

      <div className={styles.header}>
        <div className={styles.iconBox}><FaGift /></div>
        <div>
          <h1>Bonos Exclusivos</h1>
          <p>4 recursos extras incluidos en su acceso</p>
        </div>
      </div>

      <div className={styles.grid}>
        {bonos.map(b0 => {
          const interno = BONOS_INTERNOS[b0.numero];
          const b = interno ? { ...b0, titulo: interno.titulo, descripcion: interno.descripcion } : b0;
          return (
          <div key={b.id} className={`${styles.card} ${interno ? styles.cardDestacado : ''}`}>
            <span className={styles.numero}>BONO {b.numero}</span>
            <h3>{b.titulo}</h3>
            <p>{b.descripcion}</p>
            <div className={styles.actions}>
              {interno && (
                <Link href={interno.href} className={styles.btnEnlace}>
                  {interno.cta} <FaArrowRight />
                </Link>
              )}
              {!interno && b.enlace && (
                <a href={b.enlace} target="_blank" rel="noreferrer" className={styles.btnEnlace}>
                  <FaExternalLinkAlt /> Acceder
                </a>
              )}
              {!interno && b.archivo && (
                <a href={b.archivo} target="_blank" rel="noreferrer" className={styles.btnDescarga}>
                  <FaDownload /> Descargar
                </a>
              )}
              {!interno && !b.enlace && !b.archivo && (
                <span className={styles.proximamente}>Próximamente</span>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
