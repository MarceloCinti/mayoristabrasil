import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FaComments, FaCopy, FaCheck, FaSearch, FaArrowLeft, FaLightbulb, FaReply } from 'react-icons/fa';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import DashboardLayout from '@/components/DashboardLayout';
import {
  BLOQUES, CONVERSACION_EJEMPLO, GLOSARIO, TOTAL_MENSAJES, normalizar,
  type Bloque, type Mensaje,
} from '@/lib/mensajesNegociacion';
import styles from './mensajes.module.css';

type Vista = string; // id de bloque | 'conversacion' | 'glosario'

/** Resalta los [campos a completar] dentro del mensaje. */
function ConCampos({ texto }: { texto: string }) {
  const partes = texto.split(/(\[[^\]]+\])/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith('[') && p.endsWith(']')
          ? <mark key={i} className={styles.campo}>{p}</mark>
          : <span key={i}>{p}</span>,
      )}
    </>
  );
}

async function copiarTexto(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Fallback para navegadores sin permiso de portapapeles
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

function BotonCopiar({ texto, chico }: { texto: string; chico?: boolean }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={`${styles.btnCopiar} ${ok ? styles.copiado : ''} ${chico ? styles.btnChico : ''}`}
      onClick={async () => {
        if (await copiarTexto(texto)) {
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        }
      }}
    >
      {ok ? <><FaCheck /> ¡Copiado!</> : <><FaCopy /> Copiar mensaje</>}
    </button>
  );
}

function TarjetaMensaje({ msg, ruta }: { msg: Mensaje; ruta?: string }) {
  const [verResp, setVerResp] = useState(false);
  return (
    <article className={styles.tarjeta}>
      {ruta && <span className={styles.ruta}>{ruta}</span>}
      <h4 className={styles.pregunta}>{msg.pregunta}</h4>

      <div className={styles.burbuja}>
        <span className={styles.idioma}>🇧🇷 Para enviar (portugués)</span>
        <p className={styles.pt}><ConCampos texto={msg.pt} /></p>
        <BotonCopiar texto={msg.pt} />
      </div>

      <div className={styles.traduccion}>
        <span className={styles.idioma}>🇵🇾 Qué significa</span>
        <p><ConCampos texto={msg.es} /></p>
      </div>

      {msg.tip && (
        <p className={styles.tip}><FaLightbulb /> <span>{msg.tip}</span></p>
      )}

      {msg.respuestas && msg.respuestas.length > 0 && (
        <div className={styles.respuestas}>
          <button type="button" className={styles.btnResp} onClick={() => setVerResp(v => !v)}>
            <FaReply /> {verResp ? 'Ocultar' : 'Ver'} qué le puede responder el proveedor
          </button>
          {verResp && msg.respuestas.map((r, i) => (
            <div key={i} className={styles.respuesta}>
              <p className={styles.respPt}>«{r.pt}»</p>
              <p className={styles.respEs}>{r.es}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function Mensajes() {
  const { authorized, loading: guardLoading } = usePagoGuard();
  const [vista, setVista] = useState<Vista>(BLOQUES[0].id);
  const [busqueda, setBusqueda] = useState('');

  const resultados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (q.length < 2) return null;
    const palabras = q.split(/\s+/).filter(Boolean);
    const out: { msg: Mensaje; ruta: string }[] = [];
    for (const b of BLOQUES) {
      for (const s of b.secciones) {
        for (const msg of s.mensajes) {
          const heno = normalizar([msg.pregunta, msg.es, msg.pt, msg.claves || '', msg.tip || '', s.titulo, b.titulo, b.cubre || ''].join(' '));
          if (palabras.every(p => heno.includes(p))) out.push({ msg, ruta: `${b.titulo} › ${s.titulo}` });
        }
      }
    }
    return out;
  }, [busqueda]);

  if (guardLoading || !authorized) return null;

  const bloque: Bloque | undefined = BLOQUES.find(b => b.id === vista);

  return (
    <DashboardLayout>
      <Head><title>Diccionario del Negociador — Mayorista Brasil</title></Head>

      <Link href="/dashboard/bonos" className={styles.volver}><FaArrowLeft /> Volver a los bonos</Link>

      <header className={styles.header}>
        <div className={styles.iconBox}><FaComments /></div>
        <div>
          <span className={styles.kicker}>BONO 2</span>
          <h1>Diccionario del Negociador</h1>
          <p>
            {TOTAL_MENSAJES} mensajes en portugués, listos para copiar y pegar en WhatsApp o Instagram.
            Busque en español lo que quiere preguntar, toque <strong>Copiar mensaje</strong> y envíelo al proveedor.
          </p>
        </div>
      </header>

      <div className={styles.buscador}>
        <FaSearch />
        <input
          type="search"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="¿Qué quiere preguntar? Ej.: descuento, pedido mínimo, envío, talles…"
        />
      </div>

      {resultados ? (
        <section>
          <p className={styles.contador}>
            {resultados.length === 0
              ? 'No encontramos mensajes con esas palabras. Pruebe con otra (ej.: «precio», «flete», «garantía»).'
              : `${resultados.length} mensaje${resultados.length === 1 ? '' : 's'} encontrado${resultados.length === 1 ? '' : 's'}`}
          </p>
          <div className={styles.lista}>
            {resultados.map(({ msg, ruta }) => <TarjetaMensaje key={msg.id} msg={msg} ruta={ruta} />)}
          </div>
        </section>
      ) : (
        <>
          <nav className={styles.chips} aria-label="Categorías">
            {BLOQUES.map(b => (
              <button key={b.id} type="button"
                className={`${styles.chip} ${vista === b.id ? styles.chipActivo : ''}`}
                onClick={() => setVista(b.id)}>
                <span>{b.emoji}</span> {b.titulo}
              </button>
            ))}
            <button type="button"
              className={`${styles.chip} ${vista === 'conversacion' ? styles.chipActivo : ''}`}
              onClick={() => setVista('conversacion')}>
              <span>💬</span> Conversación completa de ejemplo
            </button>
            <button type="button"
              className={`${styles.chip} ${vista === 'glosario' ? styles.chipActivo : ''}`}
              onClick={() => setVista('glosario')}>
              <span>📖</span> Glosario
            </button>
          </nav>

          {bloque && (
            <section>
              <div className={styles.bloqueInfo}>
                <h2>{bloque.emoji} {bloque.titulo}</h2>
                <p>{bloque.descripcion}</p>
                {bloque.cubre && <p className={styles.cubre}><strong>Sirve para:</strong> {bloque.cubre}</p>}
                {bloque.id !== 'paso-a-paso' && (
                  <p className={styles.cubre}>
                    Para saludar, pagar y coordinar el envío use los mensajes de{' '}
                    <button type="button" className={styles.linkBtn} onClick={() => setVista('paso-a-paso')}>Paso a paso de la compra</button>.
                  </p>
                )}
              </div>
              {bloque.secciones.map(s => (
                <div key={s.id} className={styles.seccion}>
                  <h3>{s.titulo}</h3>
                  {s.descripcion && <p className={styles.secDesc}>{s.descripcion}</p>}
                  <div className={styles.lista}>
                    {s.mensajes.map(msg => <TarjetaMensaje key={msg.id} msg={msg} />)}
                  </div>
                </div>
              ))}
            </section>
          )}

          {vista === 'conversacion' && (
            <section>
              <div className={styles.bloqueInfo}>
                <h2>💬 Conversación completa de ejemplo</h2>
                <p>Así se ve una negociación real de principio a fin: saludo, precio, descuento, pago seguro, envío a la frontera y recompra.</p>
              </div>
              <div className={styles.chat}>
                {CONVERSACION_EJEMPLO.map((l, i) => (
                  <div key={i} className={`${styles.linea} ${l.quien === 'yo' ? styles.yo : styles.prov}`}>
                    <span className={styles.quien}>{l.quien === 'yo' ? 'Usted' : 'Proveedor'}</span>
                    <div className={styles.globo}>
                      <p className={styles.pt}><ConCampos texto={l.pt} /></p>
                      <p className={styles.globoEs}>{l.es}</p>
                      {l.quien === 'yo' && <BotonCopiar texto={l.pt} chico />}
                    </div>
                    {l.nota && <p className={styles.nota}><FaLightbulb /> {l.nota}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {vista === 'glosario' && (
            <section>
              <div className={styles.bloqueInfo}>
                <h2>📖 Glosario</h2>
                <p>Palabras que el proveedor brasileño va a usar y qué significan.</p>
              </div>
              <div className={styles.glosario}>
                {GLOSARIO.map(g => (
                  <div key={g.pt} className={styles.termino}>
                    <strong>{g.pt}</strong>
                    <span>{g.es}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
