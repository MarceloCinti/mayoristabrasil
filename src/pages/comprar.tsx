import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { FaWhatsapp, FaCopy, FaCheckCircle, FaLock, FaCcVisa, FaCcMastercard } from 'react-icons/fa';
import { FiCreditCard } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { WHATSAPP, PRECIO_GS, PRECIO_NORMAL_GS } from '@/lib/firebase';
import styles from './comprar.module.css';

export default function Comprar() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (userData?.pago || userData?.esAdmin) router.push('/dashboard');
  }, [userData, loading, router]);

  const formatGs = (n: number) => 'Gs. ' + n.toLocaleString('es-PY');

  const mensaje = encodeURIComponent(
    `Hola, quiero comprar la guía Mayorista Brasil. Mi correo registrado es: ${user?.email || '[su correo]'}`
  );
  const whatsappLink = `https://wa.me/${WHATSAPP}?text=${mensaje}`;

  const copyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      toast.success('Correo copiado');
    }
  };

  return (
    <>
      <Head><title>Comprar guía — Mayorista Brasil</title></Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoBr}>Mayorista</span>
            <span className={styles.logoPy}>Brasil</span>
          </Link>

          <div className={styles.box}>
            <h1 className={styles.title}>Acceso al sistema completo</h1>
            <div className={styles.precioOld}>Precio normal {formatGs(PRECIO_NORMAL_GS)}/mes</div>
            <div className={styles.precio}>{formatGs(PRECIO_GS)} <span style={{ fontSize: '0.4em', color: 'var(--text-mut)', fontWeight: 500 }}>/mes</span></div>
            <p className={styles.sub}>Suscripción mensual · precio promocional de lanzamiento</p>

            <div className={styles.steps}>
              <h2 className={styles.stepsTitle}>Cómo comprar:</h2>

              <div className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <div>
                  <h3>Realice el pago</h3>
                  <p>Transferencia bancaria, Tigo Money o Personal Pay.</p>
                  <p className={styles.note}>Solicite los datos por WhatsApp.</p>
                </div>
              </div>

              <div className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <div>
                  <h3>Envíenos el comprobante por WhatsApp</h3>
                  <p>Junto con su correo de registro:</p>
                  {user?.email && (
                    <div className={styles.emailBox}>
                      <span>{user.email}</span>
                      <button onClick={copyEmail} title="Copiar"><FaCopy /></button>
                    </div>
                  )}
                  {!user && (
                    <p className={styles.note}>
                      <Link href="/registro">Cree su cuenta primero</Link> para acelerar el proceso.
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <div>
                  <h3>Reciba el acceso</h3>
                  <p>Liberamos su cuenta en menos de 24 horas. Recibirá la confirmación por WhatsApp.</p>
                </div>
              </div>
            </div>

            <a href={whatsappLink} target="_blank" rel="noreferrer" className="btn btn-paraguay" style={{ width: '100%', fontSize: 16, padding: '16px 24px', marginTop: 24 }}>
              <FaWhatsapp size={20} /> Contactar por WhatsApp
            </a>

            <div className={styles.garantia}>
              <FaCheckCircle /> Plataforma actualizada constantemente · Podés cancelar cuando quieras
            </div>
          </div>

          {/* ===== VISTA PREVIA: pago con tarjeta (DESACTIVADO) =====
              Mockup visual de cómo se verá el checkout con tarjeta cuando se
              conecte la pasarela. Los campos están DESHABILITADOS: no se puede
              escribir, no se envía nada, no procesa ningún pago. */}
          <div className={`${styles.box} ${styles.cardBox}`}>
            <span className={styles.pronto}>Próximamente</span>
            <h2 className={styles.cardTitle}><FiCreditCard /> Pago con tarjeta</h2>
            <p className={styles.sub} style={{ marginBottom: 20 }}>
              Así se verá el pago con tarjeta cuando lo activemos. Por ahora, usá el método de arriba (WhatsApp).
            </p>

            <div className={styles.cardForm} aria-hidden="true">
              <div className={styles.cardBrands}><FaCcVisa /><FaCcMastercard /></div>

              <label>Número de tarjeta</label>
              <div className={styles.cardField}>
                <FiCreditCard />
                <input type="text" disabled value="" placeholder="4242 4242 4242 4242" tabIndex={-1} />
              </div>

              <div className={styles.cardRow}>
                <div>
                  <label>Vencimiento</label>
                  <div className={styles.cardField}><input type="text" disabled placeholder="MM / AA" tabIndex={-1} /></div>
                </div>
                <div>
                  <label>CVV</label>
                  <div className={styles.cardField}><input type="text" disabled placeholder="123" tabIndex={-1} /></div>
                </div>
              </div>

              <label>Nombre en la tarjeta</label>
              <div className={styles.cardField}><input type="text" disabled placeholder="NOMBRE APELLIDO" tabIndex={-1} /></div>

              <button type="button" disabled className={styles.payBtn}>
                <FaLock size={14} /> Pagar {formatGs(PRECIO_GS)}
              </button>
            </div>

            <div className={styles.securedNote}>
              <FaLock /> Pago seguro procesado por una pasarela certificada (Pagopar / Bancard). Los datos de la tarjeta nunca pasan por nuestro servidor.
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
