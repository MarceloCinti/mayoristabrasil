import { useEffect, useState } from 'react';
import { FiClock, FiLock } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { WHATSAPP, PRECIO_GS } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { PLAZO_TRANSFERENCIA_MS } from '@/lib/trial';
import PagoOpciones from './PagoOpciones';
import styles from './PaywallModal.module.css';

const fmtGs = (n: number) => 'Gs. ' + n.toLocaleString('es-PY');

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

/** Cuenta regresiva del plazo que le prometemos al cliente. */
function useCuentaRegresiva(desde?: any) {
  const [restante, setRestante] = useState<number | null>(null);
  useEffect(() => {
    const inicio = desde && desde.toDate ? desde.toDate().getTime()
      : (typeof desde === 'number' ? desde : null);
    if (!inicio) { setRestante(null); return; }
    const tick = () => setRestante(Math.max(0, inicio + PLAZO_TRANSFERENCIA_MS - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [desde]);
  return restante;
}

export default function PaywallModal() {
  const { user, userData, logout } = useAuth();
  const restante = useCuentaRegresiva(userData?.pagoSolicitadoEn);

  const mensaje = 'Hola, quiero activar mi acceso a Mayorista Brasil. Mi correo es: ' + (user?.email || '');
  const wpp = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(mensaje);

  // ===== Ya avisó que transfirió: mostramos el plazo =====
  if (userData?.pagoPendiente) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.iconoEspera}><FiClock /></div>
          <h2 className={styles.titulo}>Estamos verificando tu pago</h2>
          <p className={styles.sub}>
            Revisamos el comprobante y liberamos tu acceso. El plazo es de hasta 1 hora
            en horario comercial.
          </p>

          {restante !== null && restante > 0 && (
            <div className={styles.contador}>
              <span className={styles.contadorNum}>{mmss(restante)}</span>
              <span className={styles.contadorTxt}>tiempo estimado restante</span>
            </div>
          )}
          {restante === 0 && (
            <div className={styles.aviso}>
              Ya pasó el plazo estimado. Si todavía no tenés acceso, escribinos y lo resolvemos al toque.
            </div>
          )}

          <a href={wpp} target="_blank" rel="noreferrer" className="btn btn-wpp" style={{ width: '100%' }}>
            <FaWhatsapp /> Enviar comprobante por WhatsApp
          </a>
          <button onClick={() => logout()} className={styles.salir}>Cerrar sesión</button>
        </div>
      </div>
    );
  }

  // ===== Paywall =====
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.iconoLock}><FiLock /></div>
        <h2 className={styles.titulo}>Terminó tu acceso de prueba</h2>
        {/* A propósito no decimos cuántos clics tenía ni cuántos usó:
            la mecánica de la prueba no se le muestra al cliente. */}
        <p className={styles.sub}>
          Activá tu suscripción para seguir usando la plataforma completa.
        </p>
        <div className={styles.precio}>{fmtGs(PRECIO_GS)}<span>/mes</span></div>

        <PagoOpciones />

        <button onClick={() => logout()} className={styles.salir}>Cerrar sesión</button>
      </div>
    </div>
  );
}

