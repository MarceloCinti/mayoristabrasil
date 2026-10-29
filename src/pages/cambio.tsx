import Head from 'next/head';
import { useEffect, useState } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRefreshCw, FiArrowRight, FiX, FiCheckCircle } from 'react-icons/fi';
import { FaExchangeAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './cambio.module.css';

const fmtGs = (n: number) => 'Gs. ' + Math.round(n).toLocaleString('es-PY');
const METODOS = ['Transferencia', 'Tarjeta de crédito', 'Tarjeta de débito'];

export default function Cambio() {
  const { authorized, loading } = usePagoGuard();
  const { user, userData } = useAuth();
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [margen, setMargen] = useState(0);
  const [comision, setComision] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [reais, setReais] = useState('100');
  const [showForm, setShowForm] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Datos del destino + método
  const [destNombre, setDestNombre] = useState('');
  const [destTipo, setDestTipo] = useState('PIX');
  const [destDato, setDestDato] = useState('');
  const [destBanco, setDestBanco] = useState('');
  const [metodo, setMetodo] = useState(METODOS[0]);

  useEffect(() => {
    if (!authorized) return;
    (async () => {
      try {
        const cfg = await getDoc(doc(db, 'config', 'cambio'));
        if (cfg.exists()) { const d = cfg.data(); setMargen(Number(d.margenPorcentaje) || 0); setComision(Number(d.comisionFija) || 0); }
        const r = await fetch('https://open.er-api.com/v6/latest/BRL');
        const d = await r.json();
        if (d?.rates?.PYG) setLiveRate(d.rates.PYG);
      } catch (err) { console.error(err); }
      setCargando(false);
    })();
  }, [authorized]);

  if (loading || !authorized) return null;

  const numReais = Number(reais.replace(',', '.')) || 0;
  const tasaCliente = liveRate ? liveRate * (1 + margen / 100) : 0;
  const totalGs = numReais > 0 && tasaCliente ? Math.ceil(numReais * tasaCliente) + comision : 0;

  const solicitar = async () => {
    if (!destNombre.trim() || !destDato.trim()) { toast.error('Completá los datos de la transferencia en reales'); return; }
    if (numReais <= 0) { toast.error('Ingresá el monto a cambiar'); return; }
    if (!user) return;
    setEnviando(true);
    try {
      await addDoc(collection(db, 'solicitudesCambio'), {
        uid: user.uid, nombre: userData?.nombre || 'Usuario', email: userData?.email || '',
        whatsapp: userData?.whatsapp || '',
        montoReais: numReais, montoGs: totalGs, tasaCliente: Math.round(tasaCliente),
        margen, comision, metodoPago: metodo,
        destinoNombre: destNombre.trim(), destinoTipo: destTipo, destinoDato: destDato.trim(), destinoBanco: destBanco.trim(),
        estado: 'pendiente', createdAt: serverTimestamp(),
      });
      setEnviado(true);
    } catch (err) { console.error(err); toast.error('Error al enviar la solicitud'); }
    setEnviando(false);
  };

  return (
    <DashboardLayout>
      <Head><title>Cambio R$/Gs — Mayorista Brasil</title></Head>

      <div className={styles.header}>
        <div className={styles.headIcon}><FaExchangeAlt /></div>
        <div>
          <h1>Cambio R$ / Gs</h1>
          <p>Convertí guaraníes a reales para tus compras. Nosotros enviamos los reais por vos.</p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Calculadora */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={styles.calc}>
          <div className={styles.rateHead}>
            <span><FiRefreshCw className={cargando ? styles.spin : ''} /> Cotización del día</span>
            {tasaCliente > 0 && <span className={styles.rateVal}>1 R$ = {fmtGs(tasaCliente)}</span>}
          </div>

          <label className={styles.lbl}>¿Cuántos reales necesitás?</label>
          <div className={styles.inputReais}>
            <span>R$</span>
            <input value={reais} onChange={e => setReais(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" />
          </div>

          <div className={styles.total}>
            <span>Pagás (en guaraníes)</span>
            <AnimatePresence mode="popLayout">
              <motion.strong key={totalGs} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .25 }}>
                {totalGs ? fmtGs(totalGs) : '—'}
              </motion.strong>
            </AnimatePresence>
          </div>
          {comision > 0 && <p className={styles.notaComision}>Incluye comisión de servicio de {fmtGs(comision)}.</p>}

          <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={!tasaCliente || numReais <= 0} onClick={() => { setEnviado(false); setShowForm(true); }}>
            Solicitar cambio <FiArrowRight />
          </button>
          {!liveRate && !cargando && <p className={styles.notaComision}>No pudimos obtener la cotización ahora. Probá de nuevo en unos minutos.</p>}
        </motion.div>

        {/* Cómo funciona */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }} className={styles.pasos}>
          <h3>¿Cómo funciona?</h3>
          {[
            'Calculás cuántos reales necesitás.',
            'Cargás los datos de la transferencia en reales (PIX o cuenta del proveedor en Brasil).',
            'Elegís cómo pagar en guaraníes (transferencia, tarjeta de crédito o débito).',
            'Confirmamos por WhatsApp y enviamos los reales al destino.',
          ].map((t, i) => (
            <div key={i} className={styles.paso}><span>{i + 1}</span><p>{t}</p></div>
          ))}
        </motion.div>
      </div>

      {/* Modal solicitar */}
      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.close} onClick={() => setShowForm(false)}><FiX /></button>

            {enviado ? (
              <div className={styles.ok}>
                <FiCheckCircle className={styles.okIcon} />
                <h3>¡Solicitud enviada!</h3>
                <p>Te contactamos por WhatsApp para coordinar el pago de <strong>{fmtGs(totalGs)}</strong> y enviar los <strong>R$ {numReais}</strong>.</p>
                <button className="btn btn-primary" onClick={() => setShowForm(false)}>Listo</button>
              </div>
            ) : (
              <>
                <h3 className={styles.modalTitle}>Solicitar cambio</h3>
                <div className={styles.resumen}>
                  <div><span>Querés</span><strong>R$ {numReais}</strong></div>
                  <FiArrowRight />
                  <div><span>Pagás</span><strong className={styles.gs}>{fmtGs(totalGs)}</strong></div>
                </div>

                <h4 className={styles.subt}>Datos de la transferencia en reales (destino)</h4>
                <div className={styles.field}><label>Nombre del titular (en Brasil)</label><input value={destNombre} onChange={e => setDestNombre(e.target.value)} placeholder="Nombre del proveedor o cuenta" /></div>
                <div className={styles.row2}>
                  <div className={styles.field}><label>Tipo</label>
                    <select value={destTipo} onChange={e => setDestTipo(e.target.value)}>
                      <option>PIX</option><option>Cuenta bancaria</option>
                    </select>
                  </div>
                  <div className={styles.field}><label>Banco (opcional)</label><input value={destBanco} onChange={e => setDestBanco(e.target.value)} placeholder="Ej: Itaú, Nubank" /></div>
                </div>
                <div className={styles.field}><label>{destTipo === 'PIX' ? 'Clave PIX' : 'Datos de la cuenta'}</label><input value={destDato} onChange={e => setDestDato(e.target.value)} placeholder={destTipo === 'PIX' ? 'CPF, email, teléfono o clave aleatoria' : 'Agencia y cuenta'} /></div>

                <h4 className={styles.subt}>¿Cómo vas a pagar en guaraníes?</h4>
                <div className={styles.metodos}>
                  {METODOS.map(m => (
                    <button key={m} className={`${styles.metodo} ${metodo === m ? styles.metodoOn : ''}`} onClick={() => setMetodo(m)}>{m}</button>
                  ))}
                </div>

                <button className="btn btn-primary" style={{ width: '100%', marginTop: 18 }} disabled={enviando} onClick={solicitar}>
                  {enviando ? 'Enviando…' : 'Confirmar solicitud'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
