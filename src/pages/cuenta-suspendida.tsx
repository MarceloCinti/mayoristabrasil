import Head from 'next/head';
import { FaWhatsapp } from 'react-icons/fa';
import { FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { WHATSAPP } from '@/lib/firebase';

export default function CuentaSuspendida() {
  const { logout } = useAuth();
  const wpp = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola, mi cuenta de Mayorista Brasil aparece suspendida. ¿Pueden ayudarme?')}`;

  return (
    <>
      <Head><title>Cuenta suspendida — Mayorista Brasil</title></Head>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 460, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 22, padding: '44px 32px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,181,68,.12)', color: 'var(--oro)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 20px' }}>
            <FiAlertCircle />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 10 }}>Tu cuenta está suspendida</h1>
          <p style={{ color: 'var(--text-mut)', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
            El acceso a tu cuenta fue pausado. Si creés que es un error o querés reactivarla, contactá a soporte.
          </p>
          <a href={wpp} target="_blank" rel="noreferrer" className="btn btn-wpp" style={{ width: '100%', fontSize: 16, padding: '15px 24px' }}>
            <FaWhatsapp size={19} /> Contactar a soporte
          </a>
          <button onClick={() => logout()} style={{ marginTop: 16, color: 'var(--text-mut)', fontSize: 14 }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
