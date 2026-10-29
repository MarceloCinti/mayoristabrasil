import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiCheck, FiChevronDown, FiArrowRight } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { PROFESIONES } from '@/lib/perfil';
import { DEPARTAMENTOS, CIUDADES, GENEROS } from '@/lib/paraguay';
import styles from './completar-perfil.module.css';

export default function CompletarPerfil() {
  const router = useRouter();
  const { user, userData, loading, refreshUserData } = useAuth();
  const [step, setStep] = useState<2 | 3>(2);
  const [saving, setSaving] = useState(false);

  // Datos
  const [whatsapp, setWhatsapp] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [comercio, setComercio] = useState('');
  const [profesion, setProfesion] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [genero, setGenero] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (userData?.perfilCompleto) { router.replace('/continuar'); return; }
    if (userData) {
      setWhatsapp(userData.whatsapp || '');
      setDepartamento(userData.departamento || '');
      setCiudad(userData.ciudad || '');
      setComercio(userData.comercio || '');
      setProfesion(userData.profesion || '');
      setFechaNacimiento(userData.fechaNacimiento || '');
      setGenero(userData.genero || '');
    }
  }, [user, userData, loading, router]);

  const ciudadesDep = departamento ? (CIUDADES[departamento] || []) : [];

  const next = async () => {
    const limpio = whatsapp.replace(/[^\d+]/g, '');
    if (limpio.replace(/\D/g, '').length < 8) {
      toast.error('Ingresá un número de WhatsApp válido');
      return;
    }
    if (user) {
      try { await updateDoc(doc(db, 'usuarios', user.uid), { whatsapp: limpio }); } catch { /* noop */ }
    }
    setStep(3);
  };

  const finalizar = async () => {
    if (!departamento) { toast.error('Seleccioná tu departamento'); return; }
    if (!ciudad) { toast.error('Seleccioná tu ciudad'); return; }
    if (!fechaNacimiento) { toast.error('Ingresá tu fecha de nacimiento'); return; }
    if (!genero) { toast.error('Seleccioná tu género'); return; }
    if (!profesion) { toast.error('Seleccioná tu profesión'); return; }
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), {
        whatsapp: whatsapp.replace(/[^\d+]/g, ''),
        departamento,
        ciudad,
        comercio: comercio.trim(),
        profesion,
        fechaNacimiento,
        genero,
        perfilCompleto: true,
      });
      await refreshUserData();
      toast.success('¡Perfil completo!');
      router.replace('/continuar');
    } catch {
      toast.error('Error al guardar');
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <>
      <Head><title>Completá tu perfil — Mayorista Brasil</title></Head>
      <div className={styles.page}>
        <div className={styles.box}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>M</span>
            <span>Mayorista <b>Brasil</b></span>
          </div>

          <div className={styles.steps}>
            <span className={`${styles.stepDot} ${styles.done}`}>1</span>
            <span className={styles.stepLine} />
            <span className={`${styles.stepDot} ${step >= 2 ? styles.active : ''}`}>2</span>
            <span className={styles.stepLine} />
            <span className={`${styles.stepDot} ${step >= 3 ? styles.active : ''}`}>3</span>
          </div>

          {step === 2 && (
            <div className={styles.stepBody}>
              <h1>Tu WhatsApp</h1>
              <p className={styles.sub}>Lo usamos para enviarte tu acceso y dar soporte.</p>
              <div className={styles.field}>
                <label>Número de WhatsApp</label>
                <div className={styles.wppInput}>
                  <FaWhatsapp />
                  <input type="tel" placeholder="+595 9xx xxx xxx" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
                </div>
                <span className={styles.hint}>Incluí el código de país (ej: +595 para Paraguay).</span>
              </div>
              <button onClick={next} className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
                Continuar <FiArrowRight />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className={styles.stepBody}>
              <h1>Un par de datos más</h1>
              <p className={styles.sub}>Para conocerte mejor y darte mejores recomendaciones.</p>

              <Picker label="Departamento" value={departamento} placeholder="Seleccioná tu departamento"
                options={[...DEPARTAMENTOS]} onChange={(v) => { setDepartamento(v); setCiudad(''); }} />

              <Picker label="Ciudad" value={ciudad} placeholder={departamento ? 'Seleccioná tu ciudad' : 'Elegí primero el departamento'}
                options={ciudadesDep} onChange={setCiudad} disabled={!departamento} />

              <div className={styles.field}>
                <label>Fecha de nacimiento</label>
                <input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} max="2012-12-31" />
              </div>

              <Picker label="Género" value={genero} placeholder="Seleccioná una opción"
                options={[...GENEROS]} onChange={setGenero} />

              <Picker label="Profesión" value={profesion} placeholder="Seleccioná una opción"
                options={[...PROFESIONES]} onChange={setProfesion} />

              <div className={styles.field}>
                <label>Nombre de tu local o comercio <span className={styles.opt}>(opcional)</span></label>
                <input placeholder="Ej: Boutique Lorena" value={comercio} onChange={e => setComercio(e.target.value)} />
              </div>

              <div className={styles.actions}>
                <button onClick={() => setStep(2)} className="btn btn-secondary">Atrás</button>
                <button onClick={finalizar} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
                  {saving ? 'Guardando…' : 'Finalizar'} <FiCheck />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Select colapsable reutilizable (estilo Apple)
function Picker({ label, value, placeholder, options, onChange, disabled }: {
  label: string; value: string; placeholder: string; options: string[]; onChange: (v: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <div className={styles.select}>
        <button type="button" className={styles.selectBtn} disabled={disabled}
          onClick={() => !disabled && setOpen(o => !o)} style={disabled ? { opacity: .5, cursor: 'not-allowed' } : undefined}>
          <span className={value ? '' : styles.placeholder}>{value || placeholder}</span>
          <FiChevronDown className={open ? styles.chevOpen : ''} />
        </button>
        {open && !disabled && (
          <div className={styles.options}>
            {options.map(o => (
              <button key={o} type="button" className={`${styles.option} ${value === o ? styles.optionSel : ''}`}
                onClick={() => { onChange(o); setOpen(false); }}>
                {o}{value === o && <FiCheck />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
