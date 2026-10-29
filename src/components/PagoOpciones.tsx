import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { FiCreditCard, FiCopy, FiCheck, FiX, FiLock } from 'react-icons/fi';
import { FaWhatsapp, FaUniversity } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { db, WHATSAPP } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { DatosPago, PAGO_DOC, mergePago } from '@/lib/trial';
import styles from './PagoOpciones.module.css';

/**
 * Métodos de pago (transferencia + tarjeta). Lo usan el popup del paywall
 * y la página /comprar. Requiere usuario logueado.
 *
 * Tarjeta: el checkout de Hotmart se abre en un iframe ENCIMA de nuestro sitio
 * (checkoutMode=2, lo mismo que hace el widget oficial de Hotmart, pero sin
 * cargar jQuery). Cuando Hotmart aprueba, el webhook marca `pago` en Firestore;
 * acá escuchamos ese doc y llamamos a onPagado, sin que el cliente recargue.
 */
export default function PagoOpciones({ onPagado }: { onPagado?: () => void }) {
  const { user, userData, refreshUserData } = useAuth();
  const [pago, setPago] = useState<DatosPago | null>(null);
  const [tab, setTab] = useState<'transferencia' | 'tarjeta'>('tarjeta');
  const [enviando, setEnviando] = useState(false);
  const [checkout, setCheckout] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, PAGO_DOC.col, PAGO_DOC.id));
        const p = mergePago(snap.exists() ? (snap.data() as Partial<DatosPago>) : {});
        setPago(p);
      } catch {
        setPago(mergePago({}));
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'usuarios', user.uid), snap => {
      if (snap.data()?.pago && !userData?.pago) {
        setCheckout(false);
        refreshUserData();
        toast.success('¡Pago aprobado! Tu acceso ya está activo.');
        onPagado?.();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userData?.pago]);

  // sck = uid: Hotmart lo devuelve en el webhook y así sabemos quién pagó
  // aunque use otro email en el checkout. `email` solo precarga el formulario.
  const linkHotmart = (url: string) => {
    try {
      const u = new URL(url);
      u.searchParams.set('checkoutMode', '2');
      if (user) u.searchParams.set('sck', user.uid);
      if (user?.email) u.searchParams.set('email', user.email);
      return u.toString();
    } catch {
      return url;
    }
  };

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
  const tarjetaActiva = !!pago?.hotmartActivo && !!pago.hotmartUrl;

  return (
    <>
      <div className={styles.tabs}>
        <button
          type="button"
          className={tab === 'tarjeta' ? styles.tab + ' ' + styles.tabOn : styles.tab}
          onClick={() => setTab('tarjeta')}
        >
          <FiCreditCard /> Tarjeta
        </button>
        <button
          type="button"
          className={tab === 'transferencia' ? styles.tab + ' ' + styles.tabOn : styles.tab}
          onClick={() => setTab('transferencia')}
        >
          <FaUniversity /> Transferencia
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
          {tarjetaActiva ? (
            <>
              <p className={styles.panelTxt}>
                Pagás con tarjeta de crédito o débito y el acceso se libera <strong>al instante</strong>,
                apenas se confirma el pago. Sin salir de esta página.
              </p>
              <button
                type="button"
                onClick={() => setCheckout(true)}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                <FiCreditCard /> Pagar con tarjeta
              </button>
              <p className={styles.seguro}><FiLock /> Pago seguro procesado por Hotmart</p>
            </>
          ) : (
            <div className={styles.aviso}>
              <strong>Próximamente.</strong> El pago con tarjeta se está configurando.
              Por ahora usá transferencia — te liberamos el acceso en hasta 1 hora.
              <button
                type="button"
                onClick={() => setTab('transferencia')}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 14 }}
              >
                <FaUniversity /> Pagar por transferencia
              </button>
            </div>
          )}
        </div>
      )}

      {checkout && pago && (
        <div className={styles.checkoutFondo} onClick={() => setCheckout(false)}>
          <div className={styles.checkoutCaja} onClick={e => e.stopPropagation()}>
            <button type="button" className={styles.checkoutCerrar} onClick={() => setCheckout(false)} title="Cerrar">
              <FiX />
            </button>
            <iframe
              src={linkHotmart(pago.hotmartUrl)}
              className={styles.checkoutIframe}
              title="Pago con tarjeta"
              allow="payment"
            />
          </div>
        </div>
      )}
    </>
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
