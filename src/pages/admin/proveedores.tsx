import Head from 'next/head';
import { useEffect, useState, useRef, FormEvent } from 'react';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, orderBy, writeBatch, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { FaUpload, FaPlus, FaTrash, FaEdit, FaDownload, FaTimes, FaGoogle, FaInstagram, FaFacebook, FaGlobe } from 'react-icons/fa';
import { FiRefreshCw, FiExternalLink } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { CATEGORIAS_DEFAULT, CSV_HEADERS, slugify, Categoria, agrupar } from '@/lib/categorias';
import { FaTags } from 'react-icons/fa';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import MediaUpload from '@/components/admin/MediaUpload';
import styles from './admin.module.css';

interface Proveedor {
  id?: string;
  nombre: string;
  categoria: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  direccion?: string;
  googleMaps?: string;
  rangoPrecio?: string;
  pedidoMinimo?: string;
  cantidadMinima?: string;
  enviaParaguay?: boolean;
  formaPago?: string;
  catalogo?: string;
  esSecreto?: boolean;
  esTendencia?: boolean;
  completo?: boolean;
  vistaPrevia?: boolean; // aparece GRATIS en la landing pública
  observaciones?: string;
  fotos?: string[];
  video?: string;
}

// Cuántos proveedores se muestran gratis en la landing
const MAX_PREVIEW = 8;

const FORM_VAZIO: Proveedor = {
  nombre: '', categoria: 'femenino', whatsapp: '', instagram: '', facebook: '', direccion: '',
  googleMaps: '', rangoPrecio: '', pedidoMinimo: '', cantidadMinima: '', enviaParaguay: false,
  formaPago: '', catalogo: '', esSecreto: false, esTendencia: false, completo: false, vistaPrevia: false, observaciones: '',
  fotos: [], video: '',
};

export default function AdminProveedores() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [form, setForm] = useState<Proveedor>(FORM_VAZIO);
  const [filtroCat, setFiltroCat] = useState<string>('todos');
  // Filtro por estado de curación: todos | incompletos | completos | online | off
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'incompletos' | 'completos' | 'online' | 'off'>('todos');
  // Filtros por canal de contacto (combinables entre sí, en AND)
  const [canales, setCanales] = useState<{ ig: boolean; fb: boolean; web: boolean }>({ ig: false, fb: false, web: false });
  const [busqueda, setBusqueda] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Google Sheets sync (múltiples planillas por área)
  const [showSheets, setShowSheets] = useState(false);
  const [sheets, setSheets] = useState<{ label: string; url: string; categoria?: string; lastSync?: any }[]>([]);
  const [nuevaSheet, setNuevaSheet] = useState<{ label: string; url: string; categoria: string }>({ label: '', url: '', categoria: '' });
  const [syncing, setSyncing] = useState<string | null>(null); // label que se está sincronizando
  const [borrando, setBorrando] = useState(false);
  // Categorías / Áreas (editables desde el admin, guardadas en config/categorias)
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_DEFAULT);
  const [showCats, setShowCats] = useState(false);
  const [catsSaving, setCatsSaving] = useState(false);
  const [nuevaCat, setNuevaCat] = useState('');
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatLabel, setEditCatLabel] = useState('');

  const fetch = async () => {
    try {
      const q = query(collection(db, 'proveedores'), orderBy('nombre'));
      const snap = await getDocs(q);
      setProveedores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Proveedor)));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetch();
      getDoc(doc(db, 'config', 'sheets')).then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          // Migración: si tiene el formato viejo (url única), lo convierto a array
          if (Array.isArray(d.sheets)) setSheets(d.sheets);
          else if (d.url) setSheets([{ label: 'Planilla principal', url: d.url, lastSync: d.lastSync }]);
        }
      }).catch(() => {});
      // Categorías: si ya hay lista guardada la uso; si no, la siembro con la lista por defecto
      getDoc(doc(db, 'config', 'categorias')).then(async snap => {
        const lista = snap.exists() ? (snap.data().lista as Categoria[]) : null;
        const valida = Array.isArray(lista) ? lista.filter(c => c && c.id && c.label) : [];
        const yaAgrupada = valida.some(c => c.grupo);
        const version = snap.exists() ? Number(snap.data().version || 1) : 1;
        if (valida.length > 0 && yaAgrupada && version >= 2) {
          setCategorias(valida);
        } else if (valida.length > 0 && yaAgrupada) {
          // v2: re-etiqueta al español las categorías cuyo id está en la taxonomía
          // (los ids no cambian, así que ningún proveedor queda huérfano).
          const porId = new Map(CATEGORIAS_DEFAULT.map(c => [c.id, c]));
          const traducida = valida.map(c => {
            const def = porId.get(c.id);
            return def ? { ...c, label: def.label, grupo: def.grupo } : c;
          });
          // agrega las que falten de la taxonomía
          const existentes = new Set(traducida.map(c => c.id));
          const faltantes = CATEGORIAS_DEFAULT.filter(c => !existentes.has(c.id));
          const nueva = [...traducida, ...faltantes];
          await setDoc(doc(db, 'config', 'categorias'), { lista: nueva, version: 2 });
          setCategorias(nueva);
        } else {
          // Migración a formato agrupado: se reemplaza por la taxonomía nueva.
          // Las viejas categorías vacías se descartan; las que tienen proveedores
          // se recuperan aparte (ver efecto de reconciliación de huérfanas).
          await setDoc(doc(db, 'config', 'categorias'), { lista: CATEGORIAS_DEFAULT, version: 2 });
          setCategorias(CATEGORIAS_DEFAULT);
        }
      }).catch(() => {});
    }
  }, [isAdmin]);

  // Publica un resumen PÚBLICO (config/stats) para que la landing pueda mostrar
  // números reales: la colección proveedores sólo la pueden leer usuarios pagos.
  useEffect(() => {
    if (!isAdmin || proveedores.length === 0 || categorias.length === 0) return;
    const counts: Record<string, number> = {};
    proveedores.forEach(p => { counts[p.categoria] = (counts[p.categoria] || 0) + 1; });
    const grupos = agrupar(categorias)
      .map(g => ({ nombre: g.grupo, total: g.items.reduce((s, c) => s + (counts[c.id] || 0), 0) }))
      .filter(g => g.total > 0);
    const stats = {
      proveedores: proveedores.length,
      categorias: Object.keys(counts).length,
      grupos,
      updatedAt: Date.now(),
    };
    setDoc(doc(db, 'config', 'stats'), stats).catch(() => {});
  }, [isAdmin, proveedores, categorias]);

  // Publica la VISTA PREVIA GRATUITA (config/preview, lectura pública).
  // Si todavía no marcaste ninguno, elige automáticamente 8 buenos (con foto y
  // WhatsApp) para que la landing nunca quede vacía.
  useEffect(() => {
    if (!isAdmin || proveedores.length === 0 || categorias.length === 0) return;
    const marcados = proveedores.filter(p => p.vistaPrevia && !p.esSecreto);
    const elegidos = (marcados.length > 0
      ? marcados
      : proveedores.filter(p => !p.esSecreto && p.fotos?.length && p.whatsapp)
    ).slice(0, MAX_PREVIEW);
    if (elegidos.length === 0) return;
    const items = elegidos.map(p => ({
      nombre: p.nombre,
      categoria: categorias.find(c => c.id === p.categoria)?.label || p.categoria || '',
      foto: p.fotos?.[0] || '',
      whatsapp: p.whatsapp || '',
      instagram: p.instagram || '',
      facebook: p.facebook || '',
      direccion: p.direccion || '',
      observaciones: p.observaciones || '',
    }));
    setDoc(doc(db, 'config', 'preview'), { items, auto: marcados.length === 0, updatedAt: Date.now() }).catch(() => {});
  }, [isAdmin, proveedores, categorias]);

  // Reconcilia categorías huérfanas: si algún proveedor usa una categoría que no
  // está en la lista (ej: id generado en un import sin categoría previa), la
  // agrega en "Otros" para no perderla y poder reasignarla desde el admin.
  useEffect(() => {
    if (!isAdmin || categorias.length === 0 || proveedores.length === 0) return;
    const ids = new Set(categorias.map(c => c.id));
    const huerfanas = Array.from(new Set(
      proveedores.map(p => p.categoria).filter(cat => cat && !ids.has(cat))
    )) as string[];
    if (huerfanas.length === 0) return;
    const nueva = [...categorias, ...huerfanas.map(id => ({ id, label: id, grupo: 'Otros' }))];
    setCategorias(nueva);
    setDoc(doc(db, 'config', 'categorias'), { lista: nueva, version: 2 }).catch(() => {});
  }, [isAdmin, categorias, proveedores]);

  // ===== CRUD de categorías / áreas =====
  const guardarCategorias = async (lista: Categoria[]) => {
    setCatsSaving(true);
    try {
      await setDoc(doc(db, 'config', 'categorias'), { lista }, { merge: true });
      setCategorias(lista);
    } catch { toast.error('Error al guardar categorías'); }
    setCatsSaving(false);
  };

  const agregarCategoria = async () => {
    const label = nuevaCat.trim();
    if (!label) { toast.error('Escribí un nombre'); return; }
    const id = slugify(label);
    if (!id) { toast.error('Nombre inválido'); return; }
    if (categorias.some(c => c.id === id)) { toast.error('Ya existe una categoría igual'); return; }
    await guardarCategorias([...categorias, { id, label }]);
    setNuevaCat('');
    toast.success('Categoría agregada');
  };

  const guardarEdicionCat = async () => {
    const label = editCatLabel.trim();
    if (!label) { toast.error('El nombre no puede quedar vacío'); return; }
    // Solo se edita la etiqueta; el id se mantiene para no dejar proveedores huérfanos
    await guardarCategorias(categorias.map(c => c.id === editCatId ? { ...c, label } : c));
    setEditCatId(null); setEditCatLabel('');
    toast.success('Categoría actualizada');
  };

  const eliminarCategoria = async (c: Categoria) => {
    const usados = proveedores.filter(p => p.categoria === c.id).length;
    const msg = usados > 0
      ? `"${c.label}" tiene ${usados} proveedor(es) asignados.\n\nSi la borrás, esos proveedores quedan SIN categoría (no se eliminan; los podés reasignar editándolos). ¿Continuar?`
      : `¿Borrar la categoría "${c.label}"?`;
    if (!confirm(msg)) return;
    await guardarCategorias(categorias.filter(x => x.id !== c.id));
    if (editCatId === c.id) { setEditCatId(null); setEditCatLabel(''); }
    toast.success('Categoría eliminada');
  };

  const guardarSheetsConfig = async (nuevaLista: typeof sheets) => {
    await setDoc(doc(db, 'config', 'sheets'), { sheets: nuevaLista }, { merge: true });
  };

  // Normaliza cualquier forma de lastSync (Timestamp, Date, número, {toDate}) a milisegundos.
  // Evita persistir Timestamps/funciones dentro del array de planillas.
  const lsToMillis = (ls: any): number | null => {
    if (!ls) return null;
    if (typeof ls === 'number') return ls;
    if (typeof ls.toMillis === 'function') return ls.toMillis();
    if (typeof ls.toDate === 'function') { try { return ls.toDate().getTime(); } catch { return null; } }
    if (ls instanceof Date) return ls.getTime();
    return null;
  };

  // Formatea lastSync para mostrar (acepta número, Timestamp o Date)
  const fmtSync = (ls: any): string => {
    const ms = lsToMillis(ls);
    return ms ? new Date(ms).toLocaleString('es-PY') : '';
  };

  const agregarSheet = async () => {
    const label = nuevaSheet.label.trim();
    const url = nuevaSheet.url.trim();
    if (!label || !url) { toast.error('Completá nombre y URL'); return; }
    if (sheets.some(s => s.label === label)) { toast.error('Ya existe una planilla con ese nombre'); return; }
    const nueva = [...sheets, { label, url, categoria: nuevaSheet.categoria || '' }];
    setSheets(nueva);
    await guardarSheetsConfig(nueva);
    setNuevaSheet({ label: '', url: '', categoria: '' });
    toast.success('Planilla agregada');
  };

  const quitarSheet = async (label: string) => {
    if (!confirm(`¿Quitar la planilla "${label}"? (no borra los proveedores ya sincronizados)`)) return;
    const nueva = sheets.filter(s => s.label !== label);
    setSheets(nueva);
    await guardarSheetsConfig(nueva);
  };

  // Asigna/cambia la categoría fija de una planilla ya existente
  const setSheetCategoria = async (label: string, categoria: string) => {
    const nueva = sheets.map(s => s.label === label ? { ...s, categoria } : s);
    setSheets(nueva);
    await guardarSheetsConfig(nueva);
  };

  // ===== Sincronizar UNA planilla =====
  const sincronizarUna = async (sh: { label: string; url: string; categoria?: string }) => {
    if (!sh.url.trim()) { toast.error('URL vacía'); return; }
    setSyncing(sh.label);
    const t = toast.loading(`Leyendo "${sh.label}"…`);
    try {
      const r = await window.fetch(sh.url);
      if (!r.ok) throw new Error('http');
      const csv = await r.text();
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      const rows = parsed.data as any[];
      if (rows.length === 0) { toast.dismiss(t); toast.error('Planilla vacía'); setSyncing(null); return; }
      const validIds = categorias.map(c => c.id);
      // Categoría fija de la planilla (si está asignada). Todo lo que entra por
      // esta ventana cae en esa categoría, sin importar la columna 'categoria'.
      const catFija = (sh.categoria || '').trim().toLowerCase();
      const forzarCat = catFija && validIds.includes(catFija as any) ? catFija : '';
      const existentes = new Map<string, string>();
      proveedores.forEach(p => existentes.set((p.nombre || '').trim().toLowerCase(), p.id!));
      let creados = 0, actualizados = 0, saltados = 0, nuevasCats = 0;
      let batch = writeBatch(db); let bcount = 0; const pending: Promise<any>[] = [];
      const flush = () => { pending.push(batch.commit()); batch = writeBatch(db); bcount = 0; };
      for (const row of rows) {
        const nombre = (row.nombre || '').trim();
        // La ÚNICA razón para saltar una fila es que no tenga nombre.
        if (!nombre) { saltados++; continue; }
        // Categoría: 1) fija de la planilla; 2) columna si es un id válido;
        // 3) si no, se genera un id desde el texto (NO se omite nada).
        let cat: string;
        if (forzarCat) {
          cat = forzarCat;
        } else {
          const raw = (row.categoria || '').trim().toLowerCase();
          if (validIds.includes(raw as any)) cat = raw;
          else { cat = slugify(row.categoria || '') || 'sin-categoria'; nuevasCats++; }
        }
        const fotos = String(row.fotos || '').split(/[|,]/).map((s: string) => s.trim()).filter(Boolean);
        const data: any = {
          nombre, categoria: cat,
          whatsapp: (row.whatsapp || '').trim(),
          instagram: (row.instagram || '').trim(),
          facebook: (row.facebook || '').trim(),
          direccion: (row.direccion || '').trim(),
          googleMaps: (row.googleMaps || '').trim(),
          rangoPrecio: (row.rangoPrecio || '').trim(),
          pedidoMinimo: (row.pedidoMinimo || '').trim(),
          cantidadMinima: (row.cantidadMinima || '').trim(),
          enviaParaguay: parseBool(row.enviaParaguay),
          formaPago: (row.formaPago || '').trim(),
          catalogo: (row.catalogo || '').trim(),
          esTendencia: parseBool(row.esTendencia),
          observaciones: (row.observaciones || '').trim(),
          fotos, video: (row.video || '').trim(),
          actualizadoEn: serverTimestamp(),
        };
        const existingId = existentes.get(nombre.toLowerCase());
        if (existingId) {
          // Al actualizar NO tocamos los campos de curación del admin (Online/Off y Completo),
          // así el sync no pisa lo que marcaste a mano en la tabla.
          batch.update(doc(db, 'proveedores', existingId), data);
          actualizados++;
        } else {
          // Nuevo: arranca con el valor de la planilla y sin finalizar
          batch.set(doc(collection(db, 'proveedores')), { ...data, esSecreto: parseBool(row.esSecreto), completo: false });
          creados++;
        }
        bcount++;
        if (bcount >= 400) flush();
      }
      if (bcount > 0) flush();
      await Promise.all(pending);
      // A partir de acá los proveedores YA se guardaron. El éxito del sync no
      // debe depender de lo cosmético (guardar la fecha), así que mostramos el
      // resultado antes y guardamos lastSync en un try/catch aparte.
      toast.dismiss(t);
      toast.success(`${sh.label}: ${creados} nuevos · ${actualizados} actualizados${nuevasCats ? ` · ${nuevasCats} en categoría nueva` : ''}${saltados ? ` · ${saltados} sin nombre` : ''}`);
      fetch();
      try {
        // Firestore NO permite serverTimestamp() dentro de un array → guardamos
        // la fecha como milisegundos (número) y normalizamos las demás planillas.
        const ahora = Date.now();
        const nueva = sheets.map(s => ({
          label: s.label,
          url: s.url,
          categoria: s.categoria || '',
          lastSync: s.label === sh.label ? ahora : lsToMillis(s.lastSync),
        }));
        setSheets(nueva);
        await guardarSheetsConfig(nueva);
      } catch (e) { console.warn('No se pudo guardar la fecha de sync (no afecta los datos):', e); }
    } catch (err) {
      console.error(err); toast.dismiss(t);
      toast.error(`Error en "${sh.label}". ¿Está publicada como CSV?`);
    }
    setSyncing(null);
  };

  const sincronizarTodas = async () => {
    for (const sh of sheets) await sincronizarUna(sh);
  };

  // ===== Eliminar TODOS los proveedores =====
  const eliminarTodos = async () => {
    if (proveedores.length === 0) { toast.error('No hay proveedores'); return; }
    if (!confirm(`⚠️ ¿Eliminar los ${proveedores.length} proveedores? Esta acción NO se puede deshacer.`)) return;
    if (!confirm(`Confirmá una vez más: se van a borrar ${proveedores.length} proveedores. ¿Seguro?`)) return;
    setBorrando(true);
    try {
      let batch = writeBatch(db); let bcount = 0; const pending: Promise<any>[] = [];
      for (const p of proveedores) {
        if (!p.id) continue;
        batch.delete(doc(db, 'proveedores', p.id));
        bcount++;
        if (bcount >= 400) { pending.push(batch.commit()); batch = writeBatch(db); bcount = 0; }
      }
      if (bcount > 0) pending.push(batch.commit());
      await Promise.all(pending);
      toast.success(`${proveedores.length} proveedores eliminados`);
      fetch();
    } catch (err) { console.error(err); toast.error('Error al eliminar'); }
    setBorrando(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...FORM_VAZIO, categoria: categorias[0]?.id || FORM_VAZIO.categoria });
    setShowForm(true);
  };

  const openEdit = (p: Proveedor) => {
    setEditing(p);
    setForm({ ...FORM_VAZIO, ...p });
    setShowForm(true);
  };

  // Setea una foto en una posición del array (hasta 5)
  const setFotoAt = (i: number, url: string) => {
    setForm(prev => {
      const fotos = [...(prev.fotos || [])];
      fotos[i] = url;
      return { ...prev, fotos };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.categoria) {
      toast.error('Nombre y categoría son obligatorios');
      return;
    }
    try {
      const data = { ...form, fotos: (form.fotos || []).filter(Boolean), actualizadoEn: serverTimestamp() };
      if (editing?.id) {
        await updateDoc(doc(db, 'proveedores', editing.id), data as any);
        toast.success('Proveedor actualizado');
      } else {
        await addDoc(collection(db, 'proveedores'), data);
        toast.success('Proveedor agregado');
      }
      setShowForm(false);
      fetch();
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (p: Proveedor) => {
    if (!p.id) return;
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'proveedores', p.id));
      toast.success('Proveedor eliminado');
      fetch();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // Alterna público/off (esSecreto) directo desde la tabla
  const togglePublico = async (p: Proveedor) => {
    if (!p.id) return;
    const nuevo = !p.esSecreto; // esSecreto=true => off
    setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, esSecreto: nuevo } : x));
    try { await updateDoc(doc(db, 'proveedores', p.id), { esSecreto: nuevo }); }
    catch { toast.error('No se pudo cambiar'); setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, esSecreto: !nuevo } : x)); }
  };

  // Marca/desmarca como "vista previa gratuita" (se muestra en la landing pública)
  const toggleVistaPrevia = async (p: Proveedor) => {
    if (!p.id) return;
    const nuevo = !p.vistaPrevia;
    const yaMarcados = proveedores.filter(x => x.vistaPrevia).length;
    if (nuevo && yaMarcados >= MAX_PREVIEW) {
      toast.error(`Máximo ${MAX_PREVIEW} proveedores en la vista previa. Desmarcá otro primero.`);
      return;
    }
    setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, vistaPrevia: nuevo } : x));
    try { await updateDoc(doc(db, 'proveedores', p.id), { vistaPrevia: nuevo }); }
    catch { toast.error('No se pudo cambiar'); setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, vistaPrevia: !nuevo } : x)); }
  };

  // Marca/desmarca como completo (finalizado) directo desde la tabla
  const toggleCompleto = async (p: Proveedor) => {
    if (!p.id) return;
    const nuevo = !p.completo;
    setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, completo: nuevo } : x));
    try { await updateDoc(doc(db, 'proveedores', p.id), { completo: nuevo }); }
    catch { toast.error('No se pudo cambiar'); setProveedores(prev => prev.map(x => x.id === p.id ? { ...x, completo: !nuevo } : x)); }
  };

  const downloadTemplate = () => {
    const sample = [{
      nombre: 'Tienda Ejemplo',
      categoria: 'femenino',
      whatsapp: '5511999999999',
      instagram: '@ejemplo',
      facebook: 'https://facebook.com/ejemplo',
      direccion: 'Rua Oriente 100, Brás, São Paulo',
      googleMaps: 'https://goo.gl/maps/ejemplo',
      rangoPrecio: 'R$ 30 - R$ 80',
      pedidoMinimo: 'R$ 500',
      cantidadMinima: '10 piezas por modelo',
      enviaParaguay: 'sí',
      formaPago: 'PIX, efectivo',
      catalogo: 'https://link-del-catalogo.com',
      esSecreto: 'no',
      esTendencia: 'no',
      observaciones: 'Buena calidad, atención rápida',
      fotos: 'https://ejemplo.com/foto1.jpg|https://ejemplo.com/foto2.jpg',
      video: '',
    }];
    const csv = Papa.unparse(sample, { columns: CSV_HEADERS });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-proveedores.csv';
    link.click();
  };

  const handleCsvUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) {
          toast.error('CSV vacío');
          return;
        }
        const t = toast.loading(`Importando ${rows.length} proveedores...`);
        try {
          const validIds = categorias.map(c => c.id);
          let importados = 0;
          let saltados = 0;
          const batches: any[] = [];
          let current = writeBatch(db);
          let count = 0;

          for (const row of rows) {
            if (!row.nombre || !row.nombre.trim()) { saltados++; continue; }
            // No se omite por categoría: si no es un id válido, se genera desde el texto.
            const raw = (row.categoria || '').trim().toLowerCase();
            const cat = validIds.includes(raw as any) ? raw : (slugify(row.categoria || '') || 'sin-categoria');

            const docRef = doc(collection(db, 'proveedores'));
            current.set(docRef, {
              nombre: String(row.nombre).trim(),
              categoria: cat,
              whatsapp: row.whatsapp?.trim() || '',
              instagram: row.instagram?.trim() || '',
              facebook: row.facebook?.trim() || '',
              direccion: row.direccion?.trim() || '',
              googleMaps: row.googleMaps?.trim() || '',
              rangoPrecio: row.rangoPrecio?.trim() || '',
              pedidoMinimo: row.pedidoMinimo?.trim() || '',
              cantidadMinima: row.cantidadMinima?.trim() || '',
              enviaParaguay: parseBool(row.enviaParaguay),
              formaPago: row.formaPago?.trim() || '',
              catalogo: row.catalogo?.trim() || '',
              esSecreto: parseBool(row.esSecreto),
              esTendencia: parseBool(row.esTendencia),
              observaciones: row.observaciones?.trim() || '',
            });
            count++;
            importados++;
            if (count >= 400) {
              batches.push(current);
              current = writeBatch(db);
              count = 0;
            }
          }
          if (count > 0) batches.push(current);
          await Promise.all(batches.map(b => b.commit()));

          toast.dismiss(t);
          toast.success(`${importados} importados${saltados ? `, ${saltados} omitidos` : ''}`);
          setShowImport(false);
          fetch();
        } catch (err) {
          console.error(err);
          toast.dismiss(t);
          toast.error('Error al importar');
        }
      },
      error: () => {
        toast.error('Error al leer CSV');
      }
    });
  };

  const parseBool = (v: any) => {
    if (typeof v === 'boolean') return v;
    if (!v) return false;
    const s = String(v).trim().toLowerCase();
    return ['sí', 'si', 'yes', 'true', '1', 'verdadero', 'x'].includes(s);
  };

  const filtrados = proveedores.filter(p => {
    if (filtroCat !== 'todos' && p.categoria !== filtroCat) return false;
    if (filtroEstado === 'incompletos' && p.completo) return false;
    if (filtroEstado === 'completos' && !p.completo) return false;
    if (filtroEstado === 'online' && p.esSecreto) return false;
    if (filtroEstado === 'off' && !p.esSecreto) return false;
    if (canales.ig && !p.instagram) return false;
    if (canales.fb && !p.facebook) return false;
    if (canales.web && !p.catalogo) return false;
    if (busqueda) {
      const t = busqueda.toLowerCase();
      return p.nombre.toLowerCase().includes(t);
    }
    return true;
  });

  // Contadores para el resumen (dentro de la categoría seleccionada)
  const enCat = proveedores.filter(p => filtroCat === 'todos' || p.categoria === filtroCat);
  const catsAgrupadas = agrupar(categorias);
  const nCompletos = enCat.filter(p => p.completo).length;
  const nIncompletos = enCat.length - nCompletos;
  const nOnline = enCat.filter(p => !p.esSecreto).length;
  const nOff = enCat.length - nOnline;
  const nIG = enCat.filter(p => p.instagram).length;
  const nFB = enCat.filter(p => p.facebook).length;
  const nWeb = enCat.filter(p => p.catalogo).length;

  if (guardLoading || !isAdmin) return null;

  return (
    <AdminLayout>
      <Head><title>Proveedores — Admin</title></Head>

      <div className={styles.toolbar}>
        <h2>Proveedores ({proveedores.length})</h2>
        <div className={styles.actions}>
          {proveedores.length > 0 && (
            <button onClick={eliminarTodos} disabled={borrando} className="btn btn-secondary" style={{ color: '#f87171' }}>
              <FaTrash /> {borrando ? 'Borrando…' : 'Eliminar todos'}
            </button>
          )}
          <button onClick={() => setShowCats(true)} className="btn btn-secondary"><FaTags /> Categorías ({categorias.length})</button>
          <button onClick={() => setShowSheets(true)} className="btn btn-secondary"><FaGoogle /> Google Sheets</button>
          <button onClick={() => setShowImport(true)} className="btn btn-secondary"><FaUpload /> Importar CSV</button>
          <button onClick={openCreate} className="btn btn-primary"><FaPlus /> Nuevo proveedor</button>
        </div>
      </div>

      <div className={styles.section}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} style={{ width: 200 }}>
            <option value="todos">Todas las categorías</option>
            {catsAgrupadas.map(g => <optgroup key={g.grupo} label={g.grupo}>{g.items.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</optgroup>)}
          </select>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as any)} style={{ width: 220 }}>
            <option value="todos">Todos los estados</option>
            <option value="incompletos">⏳ Faltan finalizar ({nIncompletos})</option>
            <option value="completos">✅ Finalizados ({nCompletos})</option>
            <option value="online">🟢 Online / Público ({nOnline})</option>
            <option value="off">⚫ Off / No público ({nOff})</option>
          </select>
        </div>

        {/* Resumen rápido de la categoría seleccionada */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, fontSize: 12 }}>
          {[
            { k: 'todos', txt: `Total: ${enCat.length}` },
            { k: 'incompletos', txt: `⏳ Faltan: ${nIncompletos}` },
            { k: 'completos', txt: `✅ Listos: ${nCompletos}` },
            { k: 'online', txt: `🟢 Online: ${nOnline}` },
            { k: 'off', txt: `⚫ Off: ${nOff}` },
          ].map(chip => (
            <button
              key={chip.k}
              onClick={() => setFiltroEstado(chip.k as any)}
              style={{
                padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: filtroEstado === chip.k ? 'var(--oro)' : 'var(--bg-2)',
                color: filtroEstado === chip.k ? '#111' : 'var(--text-mut)',
                fontWeight: filtroEstado === chip.k ? 700 : 500,
              }}
            >
              {chip.txt}
            </button>
          ))}
        </div>

        {/* Filtros por canal de contacto (combinables) */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, fontSize: 12, alignItems: 'center' }}>
          <span style={{ color: 'var(--text-mut)', marginRight: 2 }}>Con:</span>
          {([
            { k: 'ig', icon: <FaInstagram />, txt: `Instagram (${nIG})`, on: canales.ig },
            { k: 'fb', icon: <FaFacebook />, txt: `Facebook (${nFB})`, on: canales.fb },
            { k: 'web', icon: <FaGlobe />, txt: `Sitio (${nWeb})`, on: canales.web },
          ] as const).map(chip => (
            <button
              key={chip.k}
              onClick={() => setCanales(prev => ({ ...prev, [chip.k]: !prev[chip.k] }))}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                border: '1px solid var(--border)',
                background: chip.on ? 'var(--azul, #0a84ff)' : 'var(--bg-2)',
                color: chip.on ? '#fff' : 'var(--text-mut)',
                fontWeight: chip.on ? 700 : 500,
              }}
            >
              {chip.icon} {chip.txt}
            </button>
          ))}
          <span style={{
            marginLeft: 'auto', padding: '5px 12px', borderRadius: 20,
            border: '1px solid var(--border)', background: 'var(--bg-2)',
            color: proveedores.filter(p => p.vistaPrevia).length > 0 ? 'var(--rojo)' : 'var(--text-mut)',
            fontWeight: 700,
          }}>
            Preview landing: {proveedores.filter(p => p.vistaPrevia).length}/{MAX_PREVIEW}
            {proveedores.filter(p => p.vistaPrevia).length === 0 && ' (automático)'}
          </span>
          {(canales.ig || canales.fb || canales.web) && (
            <button
              onClick={() => setCanales({ ig: false, fb: false, web: false })}
              style={{ padding: '5px 10px', borderRadius: 20, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mut)' }}
            >
              ✕ Limpiar
            </button>
          )}
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-mut)', textAlign: 'center', padding: 40 }}>Cargando...</p>
        ) : filtrados.length === 0 ? (
          <p style={{ color: 'var(--text-mut)', textAlign: 'center', padding: 40 }}>
            {proveedores.length === 0
              ? 'Aún no hay proveedores. Importe un CSV o agregue uno manualmente.'
              : 'Sin resultados'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 90, textAlign: 'center' }}>Completo</th>
                  <th style={{ width: 80, textAlign: 'center' }} title="Se muestra gratis en la landing">Preview</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>WhatsApp</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const cat = categorias.find(c => c.id === p.categoria);
                  return (
                    <tr key={p.id} style={p.completo ? { background: 'rgba(52,199,89,.06)' } : undefined}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!p.completo}
                          onChange={() => toggleCompleto(p)}
                          title={p.completo ? 'Marcado como finalizado' : 'Marcar como finalizado'}
                          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--verde, #34c759)' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!p.vistaPrevia}
                          onChange={() => toggleVistaPrevia(p)}
                          title={p.vistaPrevia ? 'Visible gratis en la landing' : `Mostrar gratis en la landing (máx ${MAX_PREVIEW})`}
                          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--rojo)' }}
                        />
                      </td>
                      <td><strong>{p.nombre}</strong></td>
                      <td>{cat?.label || p.categoria}</td>
                      <td>{p.whatsapp || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => togglePublico(p)}
                          title={p.esSecreto ? 'Off — clic para ponerlo Online' : 'Online — clic para ponerlo Off'}
                          className={`${styles.badge} ${p.esSecreto ? styles.badgeAdmin : styles.badgePagado}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                        >
                          {p.esSecreto ? '⚫ Off' : '🟢 Online'}
                        </button>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button onClick={() => openEdit(p)} className={`${styles.btnSm} ${styles.btnSmGhost}`}><FaEdit /></button>
                          <button onClick={() => handleDelete(p)} className={`${styles.btnSm} ${styles.btnSmDanger}`}><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
              <button onClick={() => setShowForm(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div className={styles.formField}>
                  <label>Categoría *</label>
                  <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} required>
                    {catsAgrupadas.map(g => <optgroup key={g.grupo} label={g.grupo}>{g.items.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</optgroup>)}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label>WhatsApp (con código país)</label>
                  <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="5511999999999" />
                </div>
                <div className={styles.formField}>
                  <label>Instagram</label>
                  <input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@usuario" />
                </div>
                <div className={styles.formField}>
                  <label>Facebook (enlace)</label>
                  <input value={form.facebook} onChange={e => setForm({ ...form, facebook: e.target.value })} placeholder="https://facebook.com/..." />
                </div>
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label>Dirección</label>
                  <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
                </div>
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label>Google Maps (enlace)</label>
                  <input value={form.googleMaps} onChange={e => setForm({ ...form, googleMaps: e.target.value })} placeholder="https://goo.gl/maps/..." />
                </div>
                <div className={styles.formField}>
                  <label>Rango de precio</label>
                  <input value={form.rangoPrecio} onChange={e => setForm({ ...form, rangoPrecio: e.target.value })} placeholder="R$ 30 - R$ 80" />
                </div>
                <div className={styles.formField}>
                  <label>Pedido mínimo</label>
                  <input value={form.pedidoMinimo} onChange={e => setForm({ ...form, pedidoMinimo: e.target.value })} placeholder="R$ 500" />
                </div>
                <div className={styles.formField}>
                  <label>Cantidad mínima de piezas</label>
                  <input value={form.cantidadMinima} onChange={e => setForm({ ...form, cantidadMinima: e.target.value })} placeholder="Ej: 10 piezas por modelo" />
                </div>
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label>Forma de pago</label>
                  <FormaPagoSelector value={form.formaPago || ''} onChange={(v) => setForm({ ...form, formaPago: v })} />
                </div>
                <div className={styles.formField}>
                  <label>Catálogo (enlace)</label>
                  <input value={form.catalogo} onChange={e => setForm({ ...form, catalogo: e.target.value })} placeholder="https://..." />
                </div>
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label>Observaciones</label>
                  <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={3} />
                </div>

                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label>Fotos (hasta 5)</label>
                  <div className={styles.mediaGrid4}>
                    {[0, 1, 2, 3, 4].map(i => (
                      <MediaUpload
                        key={i}
                        label={`Foto ${i + 1}`}
                        accept="image" folder="proveedores" ratio="1/1"
                        value={form.fotos?.[i] || ''}
                        onChange={(url) => setFotoAt(i, url)}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label>Video (1)</label>
                  <div style={{ maxWidth: 320 }}>
                    <MediaUpload
                      label="Video del proveedor"
                      hint="Máx 60 MB, formato .mp4"
                      accept="video" folder="proveedores" ratio="16/9"
                      value={form.video || ''}
                      onChange={(url) => setForm({ ...form, video: url })}
                    />
                  </div>
                </div>
                <div className={styles.formField}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={!!form.enviaParaguay} onChange={e => setForm({ ...form, enviaParaguay: e.target.checked })} style={{ width: 'auto' }} />
                    <span>Envía a Paraguay</span>
                  </label>
                </div>
                <div className={styles.formField}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={!!form.esSecreto} onChange={e => setForm({ ...form, esSecreto: e.target.checked })} style={{ width: 'auto' }} />
                    <span>Proveedor secreto</span>
                  </label>
                </div>
                <div className={styles.formField}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={!!form.esTendencia} onChange={e => setForm({ ...form, esTendencia: e.target.checked })} style={{ width: 'auto' }} />
                    <span>Tendencia</span>
                  </label>
                </div>
                <div className={styles.formField}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={!!form.completo} onChange={e => setForm({ ...form, completo: e.target.checked })} style={{ width: 'auto' }} />
                    <span>✅ Completo (finalizado)</span>
                  </label>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Guardar cambios' : 'Agregar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Sheets modal (múltiples planillas) */}
      {showSheets && (
        <div className={styles.modalOverlay} onClick={() => setShowSheets(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className={styles.modalHead}>
              <h3><FaGoogle style={{ verticalAlign: 'middle', marginRight: 8 }} /> Planillas de Google Sheets</h3>
              <button onClick={() => setShowSheets(false)}><FaTimes /></button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ color: 'var(--text-mut)', fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                Podés tener <strong>una planilla por área</strong> (ej: una para Femenino, otra para Repuestos Autos, etc.) o una sola con todo. Cada planilla se sincroniza independientemente.
                <br />Si le asignás una <strong>categoría fija</strong>, <strong>todo</strong> lo que sincronices por esa planilla entra en esa categoría (sin importar la columna «categoria» y sin omitir nada). Dejala en «usar la columna» solo para planillas mixtas.
              </p>

              <details style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Cómo preparar cada planilla (clic)</summary>
                <ol style={{ marginTop: 10, paddingLeft: 18, color: 'var(--text-mut)', lineHeight: 1.7 }}>
                  <li>Encabezados en la fila 1: <code style={{ background: 'var(--bg-card)', padding: '1px 6px', borderRadius: 4 }}>{CSV_HEADERS.join(', ')}</code></li>
                  <li><strong>categoria válidas:</strong> {categorias.map(c => c.id).join(', ')}</li>
                  <li>Booleanos (<code>enviaParaguay / esSecreto / esTendencia</code>): <code>sí</code> o <code>no</code></li>
                  <li><strong>fotos:</strong> URLs separadas por <code>|</code></li>
                  <li>Google Sheets → <strong>Arquivo → Publicar na web → CSV → Publicar</strong> y copiá la URL.</li>
                </ol>
              </details>

              {/* Lista de planillas */}
              {sheets.length === 0 && (
                <p style={{ color: 'var(--text-mut)', fontSize: 13, textAlign: 'center', padding: 16, background: 'var(--bg-2)', borderRadius: 10 }}>
                  Todavía no hay planillas configuradas. Agregá la primera abajo.
                </p>
              )}
              {sheets.map(sh => (
                <div key={sh.label} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 10, background: 'var(--bg-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 14 }}>{sh.label}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-mut)', wordBreak: 'break-all', marginTop: 3 }}>{sh.url.slice(0, 80)}…</div>
                      {fmtSync(sh.lastSync) && (
                        <div style={{ fontSize: 11, color: 'var(--text-mut)', marginTop: 3 }}>
                          Última sync: {fmtSync(sh.lastSync)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <a href={sh.url} target="_blank" rel="noreferrer" title="Abrir" className={`${styles.btnSm} ${styles.btnSmGhost}`}><FiExternalLink /></a>
                      <button onClick={() => sincronizarUna(sh)} disabled={!!syncing} className={styles.btnSm} title="Sincronizar esta">
                        <FiRefreshCw className={syncing === sh.label ? styles.spin : ''} />
                      </button>
                      <button onClick={() => quitarSheet(sh.label)} className={`${styles.btnSm} ${styles.btnSmDanger}`} title="Quitar">
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                  {/* Categoría fija de esta planilla */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-mut)', flexShrink: 0 }}>Categoría fija:</span>
                    <select
                      value={sh.categoria || ''}
                      onChange={e => setSheetCategoria(sh.label, e.target.value)}
                      style={{ flex: 1, fontSize: 13, padding: '4px 8px' }}
                    >
                      <option value="">— usar la columna «categoria» de la planilla —</option>
                      {catsAgrupadas.map(g => <optgroup key={g.grupo} label={g.grupo}>{g.items.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</optgroup>)}
                    </select>
                  </div>
                </div>
              ))}

              {/* Agregar planilla */}
              <div style={{ padding: 14, border: '1px dashed var(--border-strong)', borderRadius: 12, marginTop: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-mut)', marginBottom: 6 }}>Nombre del área</label>
                <input value={nuevaSheet.label} onChange={e => setNuevaSheet({ ...nuevaSheet, label: e.target.value })} placeholder="Ej: Femenino, Repuestos Autos…" style={{ marginBottom: 8 }} />
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-mut)', marginBottom: 6 }}>URL CSV publicada</label>
                <input value={nuevaSheet.url} onChange={e => setNuevaSheet({ ...nuevaSheet, url: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" style={{ marginBottom: 10 }} />
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-mut)', marginBottom: 6 }}>Categoría fija (opcional)</label>
                <select value={nuevaSheet.categoria} onChange={e => setNuevaSheet({ ...nuevaSheet, categoria: e.target.value })} style={{ width: '100%', marginBottom: 10 }}>
                  <option value="">— usar la columna «categoria» de la planilla —</option>
                  {catsAgrupadas.map(g => <optgroup key={g.grupo} label={g.grupo}>{g.items.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</optgroup>)}
                </select>
                <button onClick={agregarSheet} className="btn btn-primary" style={{ width: '100%' }}><FaPlus /> Agregar planilla</button>
              </div>

              <p style={{ background: 'rgba(245,181,68,.08)', border: '1px solid rgba(245,181,68,.25)', color: 'var(--oro)', fontSize: 12, padding: 10, borderRadius: 8, marginTop: 14, lineHeight: 1.5 }}>
                ⚠️ La sincronización <strong>actualiza</strong> los proveedores existentes (por nombre) y <strong>crea</strong> los nuevos. <strong>No borra</strong> los que no estén en la planilla.
              </p>
            </div>
            <div className={styles.modalFooter}>
              {sheets.length > 0 && (
                <button onClick={sincronizarTodas} disabled={!!syncing} className="btn btn-primary" style={{ flex: 1 }}>
                  <FiRefreshCw className={syncing ? styles.spin : ''} /> {syncing ? `Sincronizando "${syncing}"…` : 'Sincronizar TODAS'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Categorías / Áreas modal */}
      {showCats && (
        <div className={styles.modalOverlay} onClick={() => setShowCats(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className={styles.modalHead}>
              <h3><FaTags style={{ verticalAlign: 'middle', marginRight: 8 }} /> Categorías / Áreas</h3>
              <button onClick={() => setShowCats(false)}><FaTimes /></button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ color: 'var(--text-mut)', fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                Estas son las categorías que se ven como filtros en la app. Podés <strong>agregar, renombrar y borrar</strong>. Al renombrar, los proveedores ya cargados <strong>no se pierden</strong> (se mantiene su identificador interno).
              </p>

              {/* Agregar nueva */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={nuevaCat}
                  onChange={e => setNuevaCat(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarCategoria(); } }}
                  placeholder="Nueva categoría (ej: Lencería, Deportivo…)"
                  style={{ flex: 1 }}
                />
                <button onClick={agregarCategoria} disabled={catsSaving} className="btn btn-primary" style={{ flexShrink: 0 }}>
                  <FaPlus /> Agregar
                </button>
              </div>

              {/* Lista agrupada por sección */}
              <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catsAgrupadas.map(g => (
                  <div key={g.grupo} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ position: 'sticky', top: 0, background: 'var(--bg-card, #12161d)', padding: '6px 2px', fontSize: 11, fontWeight: 800, color: 'var(--oro)', textTransform: 'uppercase', letterSpacing: '.05em', zIndex: 1 }}>
                      {g.grupo} <span style={{ color: 'var(--text-mut)', fontWeight: 500 }}>({g.items.length})</span>
                    </div>
                {g.items.map(c => {
                  const usados = proveedores.filter(p => p.categoria === c.id).length;
                  const enEdicion = editCatId === c.id;
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-2)' }}>
                      {enEdicion ? (
                        <>
                          <input
                            value={editCatLabel}
                            onChange={e => setEditCatLabel(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardarEdicionCat(); } if (e.key === 'Escape') { setEditCatId(null); } }}
                            autoFocus
                            style={{ flex: 1 }}
                          />
                          <button onClick={guardarEdicionCat} disabled={catsSaving} className={`${styles.btnSm}`} title="Guardar">✓</button>
                          <button onClick={() => { setEditCatId(null); setEditCatLabel(''); }} className={`${styles.btnSm} ${styles.btnSmGhost}`} title="Cancelar"><FaTimes /></button>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ fontSize: 14 }}>{c.label}</strong>
                            <span style={{ fontSize: 11, color: 'var(--text-mut)', marginLeft: 8 }}>
                              {usados > 0 ? `${usados} proveedor${usados > 1 ? 'es' : ''}` : 'sin proveedores'} · <code style={{ opacity: .7 }}>{c.id}</code>
                            </span>
                          </div>
                          <button onClick={() => { setEditCatId(c.id); setEditCatLabel(c.label); }} className={`${styles.btnSm} ${styles.btnSmGhost}`} title="Renombrar"><FaEdit /></button>
                          <button onClick={() => eliminarCategoria(c)} disabled={catsSaving} className={`${styles.btnSm} ${styles.btnSmDanger}`} title="Borrar"><FaTrash /></button>
                        </>
                      )}
                    </div>
                  );
                })}
                  </div>
                ))}
              </div>

              <p style={{ background: 'rgba(245,181,68,.08)', border: '1px solid rgba(245,181,68,.25)', color: 'var(--oro)', fontSize: 12, padding: 10, borderRadius: 8, marginTop: 14, lineHeight: 1.5 }}>
                ⚠️ Si borrás una categoría que tiene proveedores, esos proveedores quedan sin categoría (no se borran). Reasignálos editándolos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CSV import modal */}
      {showImport && (
        <div className={styles.modalOverlay} onClick={() => setShowImport(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>Importar proveedores desde CSV</h3>
              <button onClick={() => setShowImport(false)}><FaTimes /></button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ color: 'var(--text-mut)', marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
                1. Descargue la plantilla CSV abajo<br />
                2. Llénela en Google Sheets o Excel<br />
                3. Expórtela como CSV y súbala aquí
              </p>
              <p style={{ background: 'var(--bg-elev)', padding: 12, borderRadius: 8, fontSize: 12, color: 'var(--text-mut)', marginBottom: 20, lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text)' }}>Categorías válidas:</strong> {categorias.map(c => c.id).join(', ')}<br />
                <strong style={{ color: 'var(--text)' }}>Booleanos:</strong> use "sí" o "no" para enviaParaguay y esSecreto
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={downloadTemplate} className="btn btn-secondary"><FaDownload /> Descargar plantilla</button>
                <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary"><FaUpload /> Subir CSV</button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const OPCIONES_PAGO = ['PIX', 'Tarjeta', 'Transferencia', 'Efectivo'];

function FormaPagoSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = (value || '').split(',').map(s => s.trim()).filter(Boolean);
  const [sel, setSel] = useState<string[]>(parts.filter(p => OPCIONES_PAGO.includes(p)));
  const initialOtro = parts.filter(p => !OPCIONES_PAGO.includes(p)).join(', ');
  const [otroOn, setOtroOn] = useState(initialOtro.length > 0);
  const [otroText, setOtroText] = useState(initialOtro);

  const emit = (nextSel: string[], nextOtroOn: boolean, nextOtro: string) => {
    const arr = [...nextSel];
    if (nextOtroOn && nextOtro.trim()) arr.push(nextOtro.trim());
    onChange(arr.join(', '));
  };

  const toggle = (op: string) => {
    const next = sel.includes(op) ? sel.filter(x => x !== op) : [...sel, op];
    setSel(next); emit(next, otroOn, otroText);
  };

  const toggleOtro = () => {
    const next = !otroOn;
    setOtroOn(next); emit(sel, next, otroText);
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {OPCIONES_PAGO.map(op => (
          <label key={op} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={sel.includes(op)} onChange={() => toggle(op)} style={{ width: 'auto' }} />
            {op}
          </label>
        ))}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={otroOn} onChange={toggleOtro} style={{ width: 'auto' }} />
          Otro
        </label>
      </div>
      {otroOn && (
        <input
          style={{ marginTop: 10 }}
          value={otroText}
          onChange={e => { setOtroText(e.target.value); emit(sel, true, e.target.value); }}
          placeholder="Escribí la forma de pago"
        />
      )}
    </div>
  );
}
