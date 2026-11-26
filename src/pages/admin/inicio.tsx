import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiSave, FiExternalLink, FiPlus, FiCheck, FiTrash2, FiArrowUp, FiArrowDown, FiStar, FiSearch } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { Proveedor } from '@/lib/proveedorTypes';
import {
  INICIO_DOC, InicioConfig, DEFAULT_INICIO, mergeInicio, nuevoId,
  BannerInicio, NovedadInicio, VideoInicio, BANNERS_PADRAO,
} from '@/lib/inicio';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import MediaUpload from '@/components/admin/MediaUpload';
import { ARTES } from '@/components/BannerArte';
import styles from './admin.module.css';

type Lista = 'banners' | 'novedades' | 'videos';
const hoje = () => new Date().toISOString().slice(0, 10);

const bloco: React.CSSProperties = { padding: 16, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14, background: 'var(--bg-2)' };
const linhaTopo: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' };
const check: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 };

export default function AdminInicio() {
  const { isAdmin, loading } = useAdminGuard();
  const [cfg, setCfg] = useState<InicioConfig>(DEFAULT_INICIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const s = await getDoc(doc(db, INICIO_DOC.col, INICIO_DOC.id));
        if (s.exists()) setCfg(mergeInicio(s.data() as Partial<InicioConfig>));
      } catch (e) { console.error(e); }
      setCarregando(false);
      try {
        const snap = await getDocs(collection(db, 'proveedores'));
        setProveedores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Proveedor)));
      } catch (e) { console.error(e); }
    })();
  }, [isAdmin]);

  const editar = <L extends Lista>(lista: L, id: string, campo: string, valor: unknown) =>
    setCfg(c => ({ ...c, [lista]: (c[lista] as { id: string }[]).map(x => x.id === id ? { ...x, [campo]: valor } : x) }));
  const remover = (lista: Lista, id: string) => {
    if (!confirm('¿Quitar este elemento? (se aplica al guardar)')) return;
    setCfg(c => ({ ...c, [lista]: (c[lista] as { id: string }[]).filter(x => x.id !== id) }));
  };
  const mover = (lista: Lista, id: string, d: number) => setCfg(c => {
    const arr = [...(c[lista] as { id: string }[])];
    const i = arr.findIndex(x => x.id === id); const j = i + d;
    if (j < 0 || j >= arr.length) return c;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...c, [lista]: arr };
  });

  const addBanner = () => setCfg(c => ({ ...c, banners: [...c.banners, { id: nuevoId(), titulo: '', texto: '', imagen: '', enlace: '', boton: 'Ver más', tema: 'verde', activo: true } as BannerInicio] }));
  const addNovedad = () => setCfg(c => ({ ...c, novedades: [{ id: nuevoId(), titulo: '', texto: '', etiqueta: 'Nuevo', imagen: '', enlace: '', fecha: hoje(), activa: true } as NovedadInicio, ...c.novedades] }));
  const addVideo = () => setCfg(c => ({ ...c, videos: [...c.videos, { id: nuevoId(), titulo: '', url: '', activo: true } as VideoInicio] }));
  const copiarPadrao = () => setCfg(c => ({ ...c, banners: BANNERS_PADRAO.map(b => ({ ...b, id: nuevoId() })) }));

  const toggleDestacado = (id: string) => setCfg(c => ({
    ...c, destacados: c.destacados.includes(id) ? c.destacados.filter(x => x !== id) : [...c.destacados, id],
  }));

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (q.length < 2) return [];
    return proveedores.filter(p => p.nombre?.toLowerCase().includes(q)).slice(0, 12);
  }, [busca, proveedores]);
  const porId = useMemo(() => new Map(proveedores.map(p => [p.id, p])), [proveedores]);

  const salvar = async () => {
    setSalvando(true);
    try {
      await setDoc(doc(db, INICIO_DOC.col, INICIO_DOC.id), { ...cfg, actualizadoEn: serverTimestamp() });
      toast.success('Inicio actualizado');
    } catch (e) { console.error(e); toast.error('Error al guardar'); }
    setSalvando(false);
  };

  if (loading || !isAdmin) return null;

  const controles = (lista: Lista, id: string, ativo: boolean, campoAtivo: string) => (
    <div className={styles.rowActions}>
      <label style={check}><input type="checkbox" style={{ width: 'auto' }} checked={ativo} onChange={e => editar(lista, id, campoAtivo, e.target.checked)} /> Mostrar</label>
      <button type="button" className={`${styles.btnSm} ${styles.btnSmGhost}`} onClick={() => mover(lista, id, -1)} title="Subir"><FiArrowUp /></button>
      <button type="button" className={`${styles.btnSm} ${styles.btnSmGhost}`} onClick={() => mover(lista, id, 1)} title="Bajar"><FiArrowDown /></button>
      <button type="button" className={`${styles.btnSm} ${styles.btnSmDanger}`} onClick={() => remover(lista, id)}><FiTrash2 /> Quitar</button>
    </div>
  );

  return (
    <AdminLayout>
      <Head><title>Inicio del panel — Admin</title></Head>

      <div className={styles.toolbar}>
        <h2>Inicio del panel</h2>
        <div className={styles.actions}>
          <a href="/dashboard" target="_blank" rel="noreferrer" className="btn btn-secondary"><FiExternalLink /> Ver inicio</a>
          <button onClick={salvar} disabled={salvando || carregando} className="btn btn-primary"><FiSave /> {salvando ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </div>

      {carregando ? <p style={{ color: 'var(--text-mut)', padding: 40, textAlign: 'center' }}>Cargando…</p> : (
        <>
          {/* BANNERS */}
          <div className={styles.section}>
            <div style={linhaTopo}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Banners que pasan ({cfg.banners.length})</h3>
              <div className={styles.rowActions}>
                {!cfg.banners.length && <button type="button" className={`${styles.btnSm} ${styles.btnSmGhost}`} onClick={copiarPadrao}>Partir de los 4 predeterminados</button>}
                <button type="button" className={styles.btnSm} onClick={addBanner}><FiPlus /> Agregar banner</button>
              </div>
            </div>
            {!cfg.banners.length && <p style={{ color: 'var(--text-mut)', fontSize: 13 }}>Sin banners propios: el inicio muestra 4 banners predeterminados.</p>}
            {cfg.banners.map((b, k) => (
              <div key={b.id} style={bloco}>
                <div style={linhaTopo}><strong>Banner {k + 1}</strong>{controles('banners', b.id, b.activo, 'activo')}</div>
                <div className={styles.mediaGrid}>
                  <div className={styles.formGrid}>
                    <div className={styles.formField} style={{ gridColumn: '1 / -1' }}><label>Título</label><input value={b.titulo} onChange={e => editar('banners', b.id, 'titulo', e.target.value)} /></div>
                    <div className={styles.formField} style={{ gridColumn: '1 / -1' }}><label>Texto</label><textarea rows={2} value={b.texto} onChange={e => editar('banners', b.id, 'texto', e.target.value)} /></div>
                    <div className={styles.formField}><label>Botón</label><input value={b.boton} onChange={e => editar('banners', b.id, 'boton', e.target.value)} /></div>
                    <div className={styles.formField}><label>Enlace (ej. /dashboard/secretos o https://…)</label><input value={b.enlace} onChange={e => editar('banners', b.id, 'enlace', e.target.value)} /></div>
                    <div className={styles.formField}><label>Color (si no hay foto, o debajo de ella)</label>
                      <select value={b.tema} onChange={e => editar('banners', b.id, 'tema', e.target.value)}>
                        <option value="verde">Verde</option><option value="azul">Azul</option><option value="amarelo">Amarillo</option><option value="noche">Azul noche</option>
                      </select>
                    </div>
                    <div className={styles.formField}><label>Ilustración animada</label>
                      <select value={b.arte || ''} onChange={e => editar('banners', b.id, 'arte', e.target.value)}>
                        {ARTES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <MediaUpload label="Foto de fondo (opcional)" hint="Horizontal, ancha (ej. 1600×520)." value={b.imagen} onChange={u => editar('banners', b.id, 'imagen', u)} folder="landing/inicio" ratio="16/5.2" />
                </div>
              </div>
            ))}
          </div>

          {/* NOVEDADES */}
          <div className={styles.section}>
            <div style={linhaTopo}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Novedades ({cfg.novedades.length})</h3>
              <button type="button" className={styles.btnSm} onClick={addNovedad}><FiPlus /> Agregar novedad</button>
            </div>
            {!cfg.novedades.length && <p style={{ color: 'var(--text-mut)', fontSize: 13 }}>Sin novedades: el inicio muestra 2 avisos automáticos (base y bonos).</p>}
            {cfg.novedades.map(n => (
              <div key={n.id} style={bloco}>
                <div style={linhaTopo}><strong>{n.titulo || 'Nueva novedad'}</strong>{controles('novedades', n.id, n.activa, 'activa')}</div>
                <div className={styles.mediaGrid}>
                  <div className={styles.formGrid}>
                    <div className={styles.formField} style={{ gridColumn: '1 / -1' }}><label>Título</label><input value={n.titulo} onChange={e => editar('novedades', n.id, 'titulo', e.target.value)} /></div>
                    <div className={styles.formField} style={{ gridColumn: '1 / -1' }}><label>Texto</label><textarea rows={2} value={n.texto} onChange={e => editar('novedades', n.id, 'texto', e.target.value)} /></div>
                    <div className={styles.formField}><label>Etiqueta (Nuevo, Promo, Aviso…)</label><input value={n.etiqueta} onChange={e => editar('novedades', n.id, 'etiqueta', e.target.value)} /></div>
                    <div className={styles.formField}><label>Fecha</label><input type="date" value={n.fecha} onChange={e => editar('novedades', n.id, 'fecha', e.target.value)} /></div>
                    <div className={styles.formField} style={{ gridColumn: '1 / -1' }}><label>Enlace (opcional)</label><input value={n.enlace} onChange={e => editar('novedades', n.id, 'enlace', e.target.value)} placeholder="/dashboard/proveedores?cat=jeans" /></div>
                  </div>
                  <MediaUpload label="Imagen (opcional)" value={n.imagen} onChange={u => editar('novedades', n.id, 'imagen', u)} folder="landing/inicio" ratio="1/1" />
                </div>
              </div>
            ))}
          </div>

          {/* DESTACADOS */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}><FiStar /> Proveedores destacados ({cfg.destacados.length})</h3>
            <p style={{ color: 'var(--text-mut)', fontSize: 13, marginBottom: 12 }}>Elegí qué proveedores aparecen en «Destacados de la semana». Buscá por nombre y tocá para agregar.</p>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <FiSearch style={{ position: 'absolute', left: 13, top: 14, color: 'var(--text-mut)' }} />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar proveedor…" style={{ paddingLeft: 36 }} />
            </div>
            {resultados.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {resultados.map(p => {
                  const on = cfg.destacados.includes(p.id);
                  return <button type="button" key={p.id} onClick={() => toggleDestacado(p.id)} className={`${styles.btnSm} ${on ? '' : styles.btnSmGhost}`}>{on ? <FiCheck /> : <FiPlus />} {p.nombre}</button>;
                })}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {cfg.destacados.map(id => (
                <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, background: 'var(--amarelo-tint)', fontSize: 13, fontWeight: 600 }}>
                  {porId.get(id)?.nombre || (proveedores.length ? '(proveedor eliminado)' : '…')}
                  <button type="button" onClick={() => toggleDestacado(id)} aria-label="Quitar" style={{ color: 'var(--perigo)', display: 'inline-flex' }}><FiTrash2 /></button>
                </span>
              ))}
            </div>
          </div>

          {/* VIDEOS */}
          <div className={styles.section}>
            <div style={linhaTopo}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Videos ({cfg.videos.length})</h3>
              <button type="button" className={styles.btnSm} onClick={addVideo}><FiPlus /> Agregar video</button>
            </div>
            <p style={{ color: 'var(--text-mut)', fontSize: 13, marginBottom: 12 }}>Subí un .mp4 (hasta 60 MB) o pegá un link de YouTube/Vimeo. Si no hay videos, la sección no aparece para los clientes.</p>
            {cfg.videos.map(v => (
              <div key={v.id} style={bloco}>
                <div style={linhaTopo}><strong>{v.titulo || 'Video'}</strong>{controles('videos', v.id, v.activo, 'activo')}</div>
                <div className={styles.mediaGrid}>
                  <div className={styles.formGrid}>
                    <div className={styles.formField} style={{ gridColumn: '1 / -1' }}><label>Título</label><input value={v.titulo} onChange={e => editar('videos', v.id, 'titulo', e.target.value)} /></div>
                    <div className={styles.formField} style={{ gridColumn: '1 / -1' }}><label>Link de YouTube/Vimeo (o se completa solo al subir)</label><input value={v.url} onChange={e => editar('videos', v.id, 'url', e.target.value)} placeholder="https://youtu.be/…" /></div>
                  </div>
                  <MediaUpload label="o subí el archivo" accept="video" value={/^https:\/\/firebasestorage/.test(v.url) ? v.url : ''} onChange={u => editar('videos', v.id, 'url', u)} folder="landing/inicio" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
