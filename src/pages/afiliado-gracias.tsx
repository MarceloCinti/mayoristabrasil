import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiMail } from 'react-icons/fi';

export default function AfiliadoGracias() {
  return (
    <>
      <Head><title>¡Gracias! — Mayorista Brasil</title></Head>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div
          initial={{ opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .5 }}
          style={{ maxWidth: 460, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 22, padding: '44px 32px' }}
        >
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(18,128,59,.14)', color: 'var(--verde)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 20px' }}>
            <FiCheckCircle />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 12 }}>¡Muchas gracias! 🎉</h1>
          <p style={{ color: 'var(--text-mut)', fontSize: 15, lineHeight: 1.65, marginBottom: 24 }}>
            Recibimos tu solicitud para ser afiliado. Nuestro equipo la va a revisar y, en breve, vas a recibir un <strong style={{ color: 'var(--text)' }}>email</strong> confirmando la activación de tu cuenta.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-mut)', background: 'var(--bg-2)', padding: '10px 16px', borderRadius: 999, marginBottom: 24 }}>
            <FiMail style={{ color: 'var(--cyan)' }} /> Te avisamos por email
          </div>
          <div>
            <Link href="/login" className="btn btn-primary">Ir al inicio de sesión</Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}
