import Head from 'next/head';
import { useEffect, useState, FormEvent } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import { db } from '@/lib/firebase';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import styles from './admin.module.css';

interface Bono {
  id?: string;
  numero: number;
  titulo: string;
  descripcion: string;
  enlace?: string;
  archivo?: string;
}

const FORM_VAZIO: Bono = { numero: 1, titulo: '', descripcion: '', enlace: '', archivo: '' };

export default function AdminBonos() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [bonos, setBonos] = useState<Bono[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Bono | null>(null);
  const [form, setForm] = useState<Bono>(FORM_VAZIO);

  const fetch = async () => {
    try {
      const q = query(collection(db, 'bonos'), orderBy('numero'));
      const snap = await getDocs(q);
      setBonos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bono)));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetch();
  }, [isAdmin]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...FORM_VAZIO, numero: bonos.length + 1 });
    setShowForm(true);
  };

  const openEdit = (b: Bono) => {
    setEditing(b);
    setForm({ ...FORM_VAZIO, ...b });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.descripcion.trim()) {
      toast.error('Título y descripción son obligatorios');
      return;
    }
    try {
      const data = { ...form, numero: Number(form.numero) || 1 };
      if (editing?.id) {
        await updateDoc(doc(db, 'bonos', editing.id), data as any);
        toast.success('Bono actualizado');
      } else {
        await addDoc(collection(db, 'bonos'), data);
        toast.success('Bono agregado');
      }
      setShowForm(false);
      fetch();
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (b: Bono) => {
    if (!b.id || !confirm(`¿Eliminar bono "${b.titulo}"?`)) return;
    try {
      await deleteDoc(doc(db, 'bonos', b.id));
      toast.success('Bono eliminado');
      fetch();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  if (guardLoading || !isAdmin) return null;

  return (
    <AdminLayout>
      <Head><title>Bonos — Admin</title></Head>

      <div className={styles.toolbar}>
        <h2>Bonos ({bonos.length})</h2>
        <button onClick={openCreate} className="btn btn-primary"><FaPlus /> Nuevo bono</button>
      </div>

      <div className={styles.section}>
        {loading ? (
          <p style={{ color: 'var(--text-mut)', textAlign: 'center', padding: 40 }}>Cargando...</p>
        ) : bonos.length === 0 ? (
          <p style={{ color: 'var(--text-mut)', textAlign: 'center', padding: 40 }}>
            Aún no hay bonos personalizados. Los usuarios verán los 4 bonos por defecto.
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Título</th>
                <th>Recursos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {bonos.map(b => (
                <tr key={b.id}>
                  <td>{b.numero}</td>
                  <td><strong>{b.titulo}</strong><br /><span style={{ color: 'var(--text-mut)', fontSize: 12 }}>{b.descripcion}</span></td>
                  <td>
                    {b.enlace && <span style={{ fontSize: 12, color: 'var(--br-verde)' }}>🔗 enlace</span>}
                    {b.archivo && <span style={{ fontSize: 12, color: 'var(--br-azul)', marginLeft: 8 }}>📎 archivo</span>}
                    {!b.enlace && !b.archivo && <span style={{ fontSize: 12, color: 'var(--text-mut)' }}>—</span>}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => openEdit(b)} className={`${styles.btnSm} ${styles.btnSmGhost}`}><FaEdit /></button>
                      <button onClick={() => handleDelete(b)} className={`${styles.btnSm} ${styles.btnSmDanger}`}><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>{editing ? 'Editar bono' : 'Nuevo bono'}</h3>
              <button onClick={() => setShowForm(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Número *</label>
                  <input type="number" min={1} value={form.numero} onChange={e => setForm({ ...form, numero: Number(e.target.value) })} required />
                </div>
                <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                  <label>Título *</label>
                  <input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required />
                </div>
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label>Descripción *</label>
                  <textarea rows={3} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} required />
                </div>
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label>Enlace (opcional — Google Drive, página externa, etc.)</label>
                  <input value={form.enlace} onChange={e => setForm({ ...form, enlace: e.target.value })} placeholder="https://..." />
                </div>
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label>Archivo URL (opcional — PDF subido a Firebase Storage)</label>
                  <input value={form.archivo} onChange={e => setForm({ ...form, archivo: e.target.value })} placeholder="https://firebasestorage..." />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Guardar' : 'Agregar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
