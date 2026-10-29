import Head from 'next/head';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { FaGift, FaDownload, FaExternalLinkAlt } from 'react-icons/fa';
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

const BONOS_PADRAO: Bono[] = [
  { id: 'b1', numero: 1, titulo: '50 proveedores con envío directo por WhatsApp', descripcion: 'Lista premium de contactos que despachan directamente al Paraguay sin intermediarios.' },
  { id: 'b2', numero: 2, titulo: 'Plantillas de mensajes para negociar precios', descripcion: 'Mensajes listos para copiar y enviar — funcionan tanto en WhatsApp como en Instagram.' },
  { id: 'b3', numero: 3, titulo: 'Cómo empezar la reventa con poco dinero', descripcion: 'Guía paso a paso para arrancar con menos de Gs. 1.000.000 e ir creciendo el negocio.' },
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
        {bonos.map(b => (
          <div key={b.id} className={styles.card}>
            <span className={styles.numero}>BONO {b.numero}</span>
            <h3>{b.titulo}</h3>
            <p>{b.descripcion}</p>
            <div className={styles.actions}>
              {b.enlace && (
                <a href={b.enlace} target="_blank" rel="noreferrer" className={styles.btnEnlace}>
                  <FaExternalLinkAlt /> Acceder
                </a>
              )}
              {b.archivo && (
                <a href={b.archivo} target="_blank" rel="noreferrer" className={styles.btnDescarga}>
                  <FaDownload /> Descargar
                </a>
              )}
              {!b.enlace && !b.archivo && (
                <span className={styles.proximamente}>Próximamente</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
