import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCheck, FiHome, FiTrendingUp, FiRepeat, FiDollarSign, FiStar, FiPlay } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { db, ADMIN_EMAIL } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COMISION_DEFAULT } from '@/lib/afiliados';
import styles from './afiliacion.module.css';

export default function Afiliacion() {
  const router = useRouter();
  const { user, userData, loading, refreshUserData } = useAuth();
  const [activando, setActivando] = useState(false);

  useEffect(() => {
    if (!loading && userData?.esAfiliado) router.replace('/afiliado');
  }, [loading, userData, router]);

  const activar = async () => {
    if (!user) { router.push('/registro'); return; }
    setActivando(true);
    try {
      // Evita solicitudes duplicadas
      const ya = await getDocs(query(collection(db, 'solicitudesAfiliado'), where('uid', '==', user.uid), where('estado', '==', 'pendiente')));
      if (ya.size === 0) {
        await addDoc(collection(db, 'solicitudesAfiliado'), {
          uid: user.uid,
          nombre: userData?.nombre || 'Usuario',
          email: userData?.email || '',
          whatsapp: userData?.whatsapp || '',
          estado: 'pendiente',
          createdAt: serverTimestamp(),
        });
        // Notifica al admin por email
        fetch('/api/enviar-masivo', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipients: [{ email: ADMIN_EMAIL, nombre: 'Admin' }],
            asunto: 'Nuevo afiliado quiere activarse',
            mensaje: `${userData?.nombre || 'Un usuario'} (${userData?.email || ''}) solicitó activar su cuenta de afiliado.\n\nEntrá al panel admin → Afiliados para aprobarlo.`,
          }),
        }).catch(() => {});
      }
      router.replace('/afiliado-gracias');
    } catch (err) {
      console.error(err);
      toast.error('Error al enviar la solicitud. Reintentá.');
      setActivando(false);
    }
  };

  return (
    <>
      <Head><title>Programa de Afiliados — Mayorista Brasil</title></Head>
      <div className={styles.page}>
        <div className={styles.bg} />
        <header className={styles.nav}>
          <Link href="/" className={styles.brand}><span className={styles.mark}>M</span> Mayorista <b>Brasil</b></Link>
          {user ? <Link href="/continuar" className={styles.navLink}>Mi cuenta</Link> : <Link href="/login" className={styles.navLink}>Ingresar</Link>}
        </header>

        {/* Hero */}
        <section className={styles.hero}>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
            <span className={styles.pill}>💸 Programa de Afiliados</span>
            <h1>Ganá dinero extra <span className={styles.grad}>desde tu casa</span>, sin invertir nada</h1>
            <p className={styles.lead}>
              Recomendá Mayorista Brasil con tu link, y ganás una comisión por cada persona que entra. Sin stock, sin vender productos, sin salir de casa.
            </p>
            <button onClick={activar} disabled={activando} className="btn btn-primary" style={{ fontSize: 16, padding: '15px 30px' }}>
              {activando ? 'Activando…' : (user ? 'Activar mi cuenta de afiliado' : 'Crear cuenta y ser afiliado')} <FiArrowRight />
            </button>
            <div className={styles.micro}>
              <span><FiCheck /> Gratis</span><span><FiCheck /> Sin inversión</span><span><FiCheck /> Cobrás por transferencia</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .5, delay: .1 }} className={styles.videoSlot}>
            <span className={styles.playBtn}><FiPlay /></span>
            <span className={styles.videoLabel}>Video de presentación (próximamente)</span>
          </motion.div>
        </section>

        {/* Beneficios */}
        <section className={styles.benes}>
          {[
            { icon: <FiHome />, t: 'Desde tu casa', d: 'Trabajás desde el celular, cuando quieras.' },
            { icon: <FiDollarSign />, t: 'Sin invertir', d: 'No comprás stock ni pagás nada para empezar.' },
            { icon: <FiRepeat />, t: 'Ingreso recurrente', d: 'Con el plan VIP mensual, ganás todos los meses.' },
            { icon: <FiTrendingUp />, t: 'Sin límite', d: 'Cuanta más gente traés, más ganás.' },
          ].map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .05 }} className={styles.beneCard}>
              <span className={styles.beneIcon}>{b.icon}</span>
              <strong>{b.t}</strong><p>{b.d}</p>
            </motion.div>
          ))}
        </section>

        {/* Cómo funciona */}
        <section className={styles.como}>
          <h2>Cómo ganás</h2>
          <div className={styles.pasos}>
            {[
              { n: '1', t: 'Activás tu cuenta', d: 'Es gratis. Recibís tu link de afiliado único.' },
              { n: '2', t: 'Compartís tu link', d: 'Por WhatsApp, Instagram, donde quieras.' },
              { n: '3', t: 'Ganás por cada venta', d: `Cobrás ${COMISION_DEFAULT}% cada vez que alguien compra el acceso con tu link.` },
              { n: '4', t: 'Ingreso recurrente VIP', d: 'Cuando lancemos el plan VIP mensual, vas a ganar TODOS los meses que esa persona siga pagando.' },
            ].map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .05 }} className={styles.paso}>
                <span className={styles.pasoNum}>{p.n}</span>
                <div><strong>{p.t}</strong><p>{p.d}</p></div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Testimonios */}
        <section className={styles.testis}>
          <h2>Lo que dicen nuestros afiliados</h2>
          <div className={styles.testiGrid}>
            {[
              { n: 'Andrea', c: 'Asunción', t: 'Empecé compartiendo en mi grupo de revendedoras y ya cobré mi primera comisión.' },
              { n: 'Diego', c: 'Encarnación', t: 'Lo mejor es que no tengo que vender nada, solo paso mi link.' },
              { n: 'Rosa', c: 'CDE', t: 'Es plata extra sin moverme de casa. Recomiendo 100%.' },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .05 }} className={styles.testiCard}>
                <div className={styles.stars}>{Array.from({ length: 5 }).map((_, k) => <FiStar key={k} fill="currentColor" />)}</div>
                <p>“{t.t}”</p>
                <div className={styles.testiAuthor}><span className={styles.avatar}>{t.n.charAt(0)}</span><div><strong>{t.n}</strong><span>{t.c}</span></div></div>
              </motion.div>
            ))}
          </div>
          <p className={styles.notaTesti}>* Próximamente: testimonios reales de nuestros afiliados.</p>
        </section>

        {/* CTA final */}
        <section className={styles.finalCta}>
          <h2>Empezá hoy a generar ingresos</h2>
          <p>Es gratis, sin riesgo y podés arrancar en minutos.</p>
          <button onClick={activar} disabled={activando} className="btn btn-primary" style={{ fontSize: 16, padding: '15px 32px' }}>
            {activando ? 'Activando…' : (user ? 'Quiero ser afiliado' : 'Crear cuenta y ser afiliado')} <FiArrowRight />
          </button>
          <p className={styles.dudas}>¿Dudas? <a href="https://wa.me/595984441777" target="_blank" rel="noreferrer"><FaWhatsapp /> Escribinos</a></p>
        </section>
      </div>
    </>
  );
}
