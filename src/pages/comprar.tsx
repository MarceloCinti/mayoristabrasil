import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { FaCheckCircle, FaWhatsapp } from 'react-icons/fa';
import { FiClock } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { WHATSAPP, PRECIO_GS, PRECIO_NORMAL_GS } from '@/lib/firebase';
import PagoOpciones from '@/components/PagoOpciones';
import styles from './comprar.module.css';

// Página de pago propia: el mismo checkout del paywall (tarjeta vía Hotmart
// embebido + transferencia), pero como página con dirección fija, para
// mandar por WhatsApp o usar en anuncios. Para pagar hace falta cuenta:
// el webhook de Hotmart identifica al cliente por su uid.

const BENEFICIOS = [
  'Contactos directos de proveedores mayoristas de Brasil',
  'Filtros por categoría, ciudad y tipo de producto',
  'Guías para comprar e importar a Paraguay',
  'Tendencias y alertas de estafas',
  'Bonos y actualizaciones constantes',
];

const formatGs = (n: number) => 'Gs. ' + n.toLocaleString('es-PY');

export default function Comprar() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (userData?.pago || userData?.esAdmin) router.push('/dashboard');
  }, [userData, loading, router]);

  const wpp = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(
    'Hola, quiero activar mi acceso a Mayorista Brasil. Mi correo es: ' + (user?.email || '')
  );

  return (
    <>
      <Head><title>Activar suscripción — Mayorista Brasil</title></Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoBr}>Mayorista</span>
            <span className={styles.logoPy}>Brasil</span>
          </Link>

          <div className={styles.box}>
            <h1 className={styles.title}>Acceso al sistema completo</h1>
            <div className={styles.precioOld}>Precio normal {formatGs(PRECIO_NORMAL_GS)}/mes</div>
            <div className={styles.precio}>{formatGs(PRECIO_GS)} <span>/mes</span></div>
            <p className={styles.sub}>Suscripción mensual · precio promocional de lanzamiento</p>

            <ul className={styles.beneficios}>
              {BENEFICIOS.map(b => <li key={b}><FaCheckCircle /> {b}</li>)}
            </ul>

            {loading ? null : !user ? (
              <div className={styles.sinCuenta}>
                <p>Para activar tu suscripción, primero creá tu cuenta gratis. Lleva un minuto.</p>
                <Link href="/registro" className="btn btn-primary" style={{ width: '100%' }}>Crear mi cuenta</Link>
                <p className={styles.yaTengo}>¿Ya tenés cuenta? <Link href="/login">Ingresá</Link></p>
              </div>
            ) : userData?.pagoPendiente ? (
              <div className={styles.pendiente}>
                <FiClock />
                <div>
                  <strong>Estamos verificando tu transferencia.</strong>
                  <p>Te liberamos el acceso en hasta 1 hora en horario comercial.</p>
                  <a href={wpp} target="_blank" rel="noreferrer"><FaWhatsapp /> Enviar comprobante por WhatsApp</a>
                </div>
              </div>
            ) : (
              <PagoOpciones onPagado={() => router.push('/dashboard')} />
            )}

            <div className={styles.garantia}>
              <FaCheckCircle /> Plataforma actualizada constantemente · Podés cancelar cuando quieras
            </div>
          </div>

          <Link href="/afiliacion" className={styles.afiliadoCta}>
            💸 ¿No querés comprar? <strong>Ganá dinero como afiliado →</strong>
          </Link>

          <p className={styles.logout}>
            <Link href="/">Volver al inicio</Link>
          </p>
        </div>
      </div>
    </>
  );
}
