import { useState, useEffect, useRef } from 'react';
import { FaWhatsapp, FaInstagram, FaFacebook, FaMapMarkerAlt, FaTruck } from 'react-icons/fa';
import { FiHeart, FiStar, FiX, FiImage, FiThumbsUp, FiCornerDownRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useCategorias } from '@/lib/useCategorias';
import { Proveedor, Resena, Respuesta, EstadoFav, ESTADOS_FAV } from '@/lib/proveedorTypes';
import Foto from './Foto';
import styles from './ProveedorCard.module.css';

interface Props {
  p: Proveedor;
  estadoFav: EstadoFav | null;
  resenas: Resena[];
  miUid: string;
  onToggleFav: (p: Proveedor) => void;
  onSetEstado: (p: Proveedor, estado: EstadoFav) => void;
  onSaveResena: (p: Proveedor, estrellas: number, texto: string) => Promise<void>;
  onToggleLike: (r: Resena) => void;
  onAddRespuesta: (r: Resena, texto: string) => Promise<void>;
}

// Asegura el prefijo R$ en valores de dinero (sin duplicar si ya lo tiene)
function enReal(v?: string): string {
  if (!v) return '';
  return /R\$|\$/.test(v) ? v : `R$ ${v}`;
}

function Estrellas({ valor, size = 14, onSet }: { valor: number; size?: number; onSet?: (n: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <FiStar
          key={n}
          size={size}
          style={{ cursor: onSet ? 'pointer' : 'default', color: n <= Math.round(valor) ? 'var(--oro)' : 'var(--border-strong)' }}
          fill={n <= Math.round(valor) ? 'currentColor' : 'none'}
          onClick={onSet ? () => onSet(n) : undefined}
        />
      ))}
    </span>
  );
}

export default function ProveedorCard({ p, estadoFav, resenas, miUid, onToggleFav, onSetEstado, onSaveResena, onToggleLike, onAddRespuesta }: Props) {
  const [open, setOpen] = useState(false);
  const { categorias } = useCategorias();
  const cat = categorias.find(c => c.id === p.categoria);
  const fotos = p.fotos || [];
  const [imgIdx, setImgIdx] = useState(0);

  // Rota las fotos del card cada 2 segundos
  useEffect(() => {
    if (fotos.length <= 1) return;
    const t = setInterval(() => setImgIdx(i => (i + 1) % fotos.length), 2000);
    return () => clearInterval(t);
  }, [fotos.length]);

  const foto = fotos.length > 0 ? fotos[imgIdx % fotos.length] : null;

  const avg = resenas.length ? resenas.reduce((a, r) => a + (r.estrellas || 0), 0) / resenas.length : 0;
  const miResena = resenas.find(r => r.uid === miUid);

  const wppLink = p.whatsapp ? `https://wa.me/${p.whatsapp.replace(/\D/g, '')}` : null;
  const igLink = p.instagram ? `https://instagram.com/${p.instagram.replace('@', '')}` : null;

  return (
    <>
      {/* CARD COMPACTO */}
      {/* data-trial-click: abrir una tarjeta gasta un clic del acceso de prueba
          (lo cuenta DashboardLayout en fase de captura) */}
      <div className={styles.card} data-trial-click onClick={() => setOpen(true)}>
        <div className={styles.thumb}>
          <Foto src={foto || undefined} alt={p.nombre} lazy fallback={<div className={styles.thumbEmpty}><FiImage /></div>} />
          {p.esTendencia && <span className={styles.tendencia}>🔥 Tendencia</span>}
          <button
            className={`${styles.fav} ${estadoFav ? styles.favOn : ''}`}
            onClick={e => { e.stopPropagation(); onToggleFav(p); }}
            title="Favorito"
          >
            <FiHeart fill={estadoFav ? 'currentColor' : 'none'} />
          </button>
          {p.video && <span className={styles.videoTag}>▶ Video</span>}
        </div>
        <div className={styles.cardBody}>
          <h3>{p.nombre}</h3>
          <div className={styles.cardMeta}>
            {cat && <span className={styles.cat}>{cat.label}</span>}
            {p.enviaParaguay && <span className={styles.envia}><FaTruck size={11} /> PY</span>}
          </div>
          {(p.rangoPrecio || p.cantidadMinima) && (
            <div className={styles.cardInfo}>
              {p.rangoPrecio && <span className={styles.cardPrecio}>{enReal(p.rangoPrecio)}</span>}
              {p.cantidadMinima && <span className={styles.cardMin}>Mín: {p.cantidadMinima}</span>}
            </div>
          )}
          <div className={styles.cardRating}>
            <Estrellas valor={avg} />
            <span>{resenas.length ? `${avg.toFixed(1)} (${resenas.length})` : 'Sin reseñas'}</span>
          </div>
        </div>
      </div>

      {open && (
        <Modal
          p={p} cat={cat} estadoFav={estadoFav} resenas={resenas} avg={avg} miResena={miResena} miUid={miUid}
          wppLink={wppLink} igLink={igLink}
          onClose={() => setOpen(false)}
          onSetEstado={onSetEstado} onSaveResena={onSaveResena}
          onToggleLike={onToggleLike} onAddRespuesta={onAddRespuesta}
        />
      )}
    </>
  );
}

function Modal({ p, cat, estadoFav, resenas, avg, miResena, miUid, wppLink, igLink, onClose, onSetEstado, onSaveResena, onToggleLike, onAddRespuesta }: any) {
  const [estrellas, setEstrellas] = useState<number>(miResena?.estrellas || 0);
  const [texto, setTexto] = useState<string>(miResena?.texto || '');
  const [enviando, setEnviando] = useState(false);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const galRef = useRef<HTMLDivElement>(null);

  const scrollGal = (dir: number) => {
    if (galRef.current) galRef.current.scrollBy({ left: dir * galRef.current.clientWidth * 0.85, behavior: 'smooth' });
  };
  const itemsGal = (p.video ? 1 : 0) + (p.fotos?.length || 0);

  const enviarRespuesta = async (r: Resena) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    await onAddRespuesta(r, replyText.trim());
    setReplyText(''); setReplyFor(null); setSendingReply(false);
  };

  const enviarResena = async () => {
    if (estrellas === 0) return;
    setEnviando(true);
    await onSaveResena(p, estrellas, texto.trim());
    setEnviando(false);
  };

  const fmtDate = (ts: any) => ts?.toDate ? ts.toDate().toLocaleDateString('es-PY') : '';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}><FiX /></button>

        {/* Galería */}
        {(p.fotos?.length || p.video) ? (
          <div className={styles.galWrap}>
            {itemsGal > 1 && (
              <button className={`${styles.galNav} ${styles.galNavL}`} onClick={() => scrollGal(-1)} aria-label="Anterior"><FiChevronLeft /></button>
            )}
            <div className={styles.galeria} ref={galRef}>
              {p.video && <video src={p.video} controls playsInline className={styles.galVideo} />}
              {(p.fotos || []).map((f: string, i: number) => (
                <div key={i} className={styles.galFoto}><Foto src={f} alt={`Foto ${i + 1}`} lazy fallback={<div className={styles.thumbEmpty}><FiImage /></div>} /></div>
              ))}
            </div>
            {itemsGal > 1 && (
              <button className={`${styles.galNav} ${styles.galNavR}`} onClick={() => scrollGal(1)} aria-label="Siguiente"><FiChevronRight /></button>
            )}
          </div>
        ) : null}

        <div className={styles.modalHead}>
          <div>
            <h2>{p.nombre}</h2>
            <div className={styles.headMeta}>
              {cat && <span className={styles.cat}>{cat.label}</span>}
              {p.esTendencia && <span className={styles.tendenciaInline}>🔥 Tendencia</span>}
            </div>
          </div>
        </div>

        <div className={styles.ratingRow}>
          <Estrellas valor={avg} size={18} />
          <span>{resenas.length ? `${avg.toFixed(1)} · ${resenas.length} reseña(s)` : 'Sin reseñas todavía'}</span>
        </div>

        {/* Info */}
        <div className={styles.info}>
          {p.direccion && <div className={styles.infoRow}><FaMapMarkerAlt className={styles.infoIcon} /><span>{p.direccion}</span></div>}
          {p.rangoPrecio && <div className={styles.infoItem}><span>Precio</span><strong>{enReal(p.rangoPrecio)}</strong></div>}
          {p.pedidoMinimo && <div className={styles.infoItem}><span>Pedido mínimo</span><strong>{enReal(p.pedidoMinimo)}</strong></div>}
          {p.cantidadMinima && <div className={styles.infoItem}><span>Cantidad mínima</span><strong>{p.cantidadMinima}</strong></div>}
          {p.formaPago && <div className={styles.infoItem}><span>Formas de pago</span><strong>{p.formaPago}</strong></div>}
          {p.enviaParaguay && <div className={styles.infoEnvia}><FaTruck /> Envía a Paraguay</div>}
        </div>

        {p.observaciones && <p className={styles.obs}>{p.observaciones}</p>}

        {/* Acciones */}
        <div className={styles.actions}>
          {wppLink && <a href={wppLink} target="_blank" rel="noreferrer" className={styles.aWpp}><FaWhatsapp /> WhatsApp</a>}
          {igLink && <a href={igLink} target="_blank" rel="noreferrer" className={styles.aIg}><FaInstagram /> Instagram</a>}
          {p.facebook && <a href={p.facebook} target="_blank" rel="noreferrer" className={styles.aIg}><FaFacebook /> Facebook</a>}
          {p.googleMaps && <a href={p.googleMaps} target="_blank" rel="noreferrer" className={styles.aMap}><FaMapMarkerAlt /> Mapa</a>}
          {p.catalogo && <a href={p.catalogo} target="_blank" rel="noreferrer" className={styles.aCat}>Catálogo</a>}
        </div>

        {/* Favorito + estado */}
        <div className={styles.favBox}>
          <span className={styles.favLabel}><FiHeart /> Guardar en favoritos como:</span>
          <div className={styles.estados}>
            {ESTADOS_FAV.map((e: any) => (
              <button
                key={e.id}
                className={`${styles.estadoBtn} ${estadoFav === e.id ? styles.estadoActivo : ''}`}
                onClick={() => onSetEstado(p, e.id)}
              >{e.label}</button>
            ))}
          </div>
        </div>

        {/* Reseña propia */}
        <div className={styles.miResena}>
          <h4>Tu opinión</h4>
          <Estrellas valor={estrellas} size={22} onSet={setEstrellas} />
          <textarea rows={2} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Escribí un comentario sobre esta tienda (opcional)" />
          <button onClick={enviarResena} disabled={enviando || estrellas === 0} className="btn btn-primary" style={{ width: '100%' }}>
            {enviando ? 'Guardando…' : miResena ? 'Actualizar reseña' : 'Publicar reseña'}
          </button>
        </div>

        {/* Comentarios de otros */}
        <div className={styles.comentarios}>
          <h4>Reseñas de otros usuarios</h4>
          {resenas.filter((r: Resena) => r.texto).length === 0 ? (
            <p className={styles.sinComentarios}>Todavía no hay comentarios. ¡Sé el primero!</p>
          ) : (
            resenas.filter((r: Resena) => r.texto).map((r: Resena) => {
              const likes = r.likes || [];
              const liked = likes.includes(miUid);
              return (
              <div key={r.id} className={styles.comentario}>
                <div className={styles.comHead}>
                  <span className={styles.comAvatar}>{(r.nombre || 'U').charAt(0)}</span>
                  <div>
                    <strong>{r.nombre}</strong>
                    <Estrellas valor={r.estrellas} size={11} />
                  </div>
                  <span className={styles.comFecha}>{fmtDate(r.createdAt)}</span>
                </div>
                <p>{r.texto}</p>

                <div className={styles.comAcciones}>
                  <button className={`${styles.comBtn} ${liked ? styles.comBtnOn : ''}`} onClick={() => onToggleLike(r)}>
                    <FiThumbsUp size={13} /> {likes.length > 0 ? likes.length : ''} Me gusta
                  </button>
                  <button className={styles.comBtn} onClick={() => { setReplyFor(replyFor === r.id ? null : r.id); setReplyText(''); }}>
                    <FiCornerDownRight size={13} /> Responder
                  </button>
                </div>

                {(r.respuestas || []).length > 0 && (
                  <div className={styles.respuestas}>
                    {(r.respuestas || []).map((rp: Respuesta, i: number) => (
                      <div key={i} className={styles.respuesta}>
                        <span className={styles.comAvatarSm}>{(rp.nombre || 'U').charAt(0)}</span>
                        <div><strong>{rp.nombre}</strong><p>{rp.texto}</p></div>
                      </div>
                    ))}
                  </div>
                )}

                {replyFor === r.id && (
                  <div className={styles.replyBox}>
                    <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Escribí una respuesta…" />
                    <button onClick={() => enviarRespuesta(r)} disabled={sendingReply || !replyText.trim()} className="btn btn-primary">Enviar</button>
                  </div>
                )}
              </div>
            );})
          )}
        </div>
      </div>
    </div>
  );
}
