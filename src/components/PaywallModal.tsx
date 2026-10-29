import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FiCreditCard, FiCopy, FiCheck, FiClock, FiLock } from 'react-icons/fi';
import { FaWhatsapp, FaUniversity } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { db, WHATSAPP, PRECIO_GS } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { DatosPago, PAGO_DOC, mergePago, PLAZO_TRANSFERENCIA_MS } from '@/lib/trial';
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
  const { user, userData, logout, refreshUserData } = useAuth();
  const [pago, setPago] = useState<DatosPago | null>(null);
  const [tab, setTab] = useState<'transferencia' | 'tarjeta'>('transferencia');
  const [enviando, setEnviando] = useState(false);
  const restante = useCuentaRegresiva(userData?.pagoSolicitadoEn);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, PAGO_DOC.col, PAGO_DOC.id));
        setPago(mergePago(snap.exists() ? (snap.data() as Partial<DatosPago>) : {}));
      } catch {
        setPago(mergePago({}));
      }
    })();
  }, []);

  const mensaje = 'Hola, quiero activar mi acceso a Mayorista Brasil. Mi correo es: ' + (user?.email || '');
  const wpp = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(mensaje);

  const copiar = (txt: string, que: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(que + ' copiado');
  };

  const avisarTransferencia = async () => {
    if (!user) return;
    setEnviando(true);
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), {
        pagoPendiente: true,
        pagoMetodo: 'transferencia',
        pagoSolicitadoEn: serverTimestamp(),
      });
      await refreshUserData();
      toast.success('Aviso enviado. Estamos verificando tu comprobante.');
    } catch {
      toast.error('No se pudo enviar el aviso. Escribinos por WhatsApp.');
    }
    setEnviando(false);
  };

  const datosCargados = !!pago && !!(pago.banco || pago.cuenta || pago.alias);

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

        <div className={styles.tabs}>
          <button
            type="button"
            className={tab === 'transferencia' ? styles.tab + ' ' + styles.tabOn : styles.tab}
            onClick={() => setTab('transferencia')}
          >
            <FaUniversity /> Transferencia
          </button>
          <button
            type="button"
            className={tab === 'tarjeta' ? styles.tab + ' ' + styles.tabOn : styles.tab}
            onClick={() => setTab('tarjeta')}
          >
            <FiCreditCard /> Tarjeta
          </button>
        </div>

        {tab === 'transferencia' ? (
          <div className={styles.panel}>
            {datosCargados ? (
              <>
                <div className={styles.datos}>
                  {pago!.banco && <Fila label="Banco / Billetera" valor={pago!.banco} onCopy={copiar} />}
                  {pago!.titular && <Fila label="Titular" valor={pago!.titular} onCopy={copiar} />}
                  {pago!.ci && <Fila label="CI" valor={pago!.ci} onCopy={copiar} />}
                  {pago!.cuenta && <Fila label="N° de cuenta" valor={pago!.cuenta} onCopy={copiar} />}
                  {pago!.alias && <Fila label="Alias" valor={pago!.alias} onCopy={copiar} />}
                </div>
                {pago!.nota && <p className={styles.nota}>{pago!.nota}</p>}
                <button
                  type="button"
                  onClick={avisarTransferencia}
                  disabled={enviando}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  <FiCheck /> {enviando ? 'Enviando…' : 'Ya transferí'}
                </button>
                <a href={wpp} target="_blank" rel="noreferrer" className={styles.wppLink}>
                  <FaWhatsapp /> Enviar el comprobante por WhatsApp
                </a>
              </>
            ) : (
              <div className={styles.aviso}>
                Los datos de transferencia todavía no están cargados. Escribinos por WhatsApp
                y te los pasamos al instante.
                <a
                  href={wpp}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-wpp"
                  style={{ width: '100%', marginTop: 14 }}
                >
                  <FaWhatsapp /> Pedir datos por WhatsApp
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.panel}>
            {pago?.hotmartActivo && pago.hotmartUrl ? (
              <>
                <p className={styles.panelTxt}>
                  Pagás con tarjeta de crédito y el acceso se libera <strong>al instante</strong>,
                  apenas se confirma el pago.
                </p>
                <a
                  href={pago.hotmartUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  <FiCreditCard /> Pagar con tarjeta
                </a>
              </>
            ) : (
              <div className={styles.aviso}>
                <strong>Próximamente.</strong> El pago con tarjeta se está configurando.
                Por ahora usá transferencia — te liberamos el acceso en hasta 1 hora.
              </div>
            )}
          </div>
        )}

        <button onClick={() => logout()} className={styles.salir}>Cerrar sesión</button>
      </div>
    </div>
  );
}

function Fila({ label, valor, onCopy }: { label: string; valor: string; onCopy: (v: string, q: string) => void }) {
  return (
    <div className={styles.fila}>
      <span className={styles.filaLabel}>{label}</span>
      <span className={styles.filaValor}>{valor}</span>
      <button type="button" className={styles.filaCopy} onClick={() => onCopy(valor, label)} title="Copiar">
        <FiCopy />
      </button>
    </div>
  );
}
