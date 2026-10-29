import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import {
  FiArrowRight, FiCheck, FiChevronDown, FiZap, FiRefreshCw, FiLock, FiMap,
  FiUsers, FiTrendingUp, FiShield, FiGift, FiEyeOff, FiHeadphones,
  FiAlertTriangle, FiClock, FiPackage, FiStar, FiPlay, FiX, FiImage,
  FiDollarSign, FiTruck, FiAward,
} from 'react-icons/fi';
import { PRECIO_GS, PRECIO_NORMAL_GS } from '@/lib/firebase';
import Reveal from '@/components/Reveal';
import DashboardPreview from '@/components/DashboardPreview';
import HeroCarrusel from '@/components/HeroCarrusel';
import Watermark from '@/components/Watermark';
import Foto from '@/components/Foto';
import { useLandingConfig } from '@/lib/landing';
import { useStats } from '@/lib/useStats';
import { useCategorias } from '@/lib/useCategorias';
import { usePreview, igUrl } from '@/lib/usePreview';
import styles from './index.module.css';

const fmt = (n: number) => 'Gs. ' + n.toLocaleString('es-PY');

// Quita "Brás" del texto MOSTRADO en la home (nombres, direcciones, testimonios
// vienen de datos reales). No altera lo guardado en Firestore.
const sinBras = (t = ''): string => t
  .replace(/del Brás/gi, 'de fábrica')
  .replace(/\s*-\s*Brás\s*,/gi, ',')
  .replace(/\s+Brás\b/gi, '')
  .replace(/\bBrás\b/gi, '')
  .replace(/\s{2,}/g, ' ')
  .replace(/\s+([,.])/g, '$1')
  .trim();

export default function Landing() {
  const { config } = useLandingConfig();
  const { stats } = useStats();
  const { items: preview } = usePreview();
  const { categorias } = useCategorias();
  const [previewSel, setPreviewSel] = useState<number | null>(null);
  // TODAS las categorías del sistema (no sólo las que tienen proveedores)
  const todasLasCategorias = categorias.map(c => c.label);
  // Número mostrado en el sitio (claim de marketing)
  const nProv = 5000;
  const nGrupos = stats.grupos.length;

  return (
    <>
      <Head>
        <title>Mayorista Brasil · Comprá directo de Fábrica y revendé en Paraguay</title>
        <meta name="description" content="Plataforma privada para comprar directo de fábrica sin intermediarios y revender en Paraguay con hasta 4x de ganancia. Proveedores reales, datos para la importación y soporte." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </Head>

      <div className={styles.page}>
        {/* ===== URGENCY TOPBAR ===== */}
        <div className={styles.urgency}>
          <span className={styles.urgencyDot} /> Precio promocional de lanzamiento — sube pronto · <strong>{fmt(PRECIO_GS)}/mes</strong>
        </div>

        {/* ===== NAV ===== */}
        <header className={styles.nav}>
          <div className={`container ${styles.navInner}`}>
            <Link href="/" className={styles.brand}>
              <span className={styles.brandMark}>M</span>
              <span className={styles.brandText}>Mayorista <span>Brasil</span></span>
            </Link>
            <nav className={styles.navLinks}>
              <a href="#proveedores">Proveedores</a>
              {nGrupos > 0 && <a href="#categorias">Categorías</a>}
              <a href="#precio">Precio</a>
              <a href="#faq">FAQ</a>
            </nav>
            <div className={styles.navRight}>
              <Link href="/login" className={styles.navLink}>Ingresar</Link>
              <Link href="/registro" className="btn btn-primary">Acceder ahora</Link>
            </div>
          </div>
        </header>

        {/* ===== HERO ===== */}
        <section className={styles.hero}>
          <div className={styles.heroBg} />
          <Watermark />
          <div className={`container ${styles.heroInner}`}>
            <Reveal>
              <div className={styles.heroLeft}>
                <span className={styles.pill}>
                  <span className={styles.pillDot} /> Plataforma privada · hecha para Paraguay 🇵🇾
                </span>
                <h1 className={styles.h1}>
                  {config.heroTitle
                    ? config.heroTitle
                    : <>Comprá <span className={styles.grad}>directo de Fábrica</span> y revendé en Paraguay</>}
                </h1>
                <p className={styles.lead}>
                  {nProv > 0 && (
                    <><strong style={{ color: 'var(--text)' }}>+{nProv.toLocaleString('es-PY')} proveedores mayoristas verificados.</strong>{' '}</>
                  )}
                  {config.heroSubtitle || 'Accedé a los proveedores reales que usan los revendedores que ganan de verdad. Sin intermediarios, sin estafas, sin perder tiempo.'}
                </p>
                <div className={styles.heroCtas}>
                  <Link href="/registro" className="btn btn-primary" style={{ fontSize: 16, padding: '16px 28px' }}>
                    Acceder ahora <FiArrowRight />
                  </Link>
                  <a href="#incluye" className="btn btn-secondary" style={{ fontSize: 16, padding: '16px 24px' }}>
                    Ver qué incluye
                  </a>
                </div>
                <div className={styles.microcopy}>
                  <span><FiZap /> Acceso inmediato</span>
                  <span><FiCheck /> Compatible con Paraguay</span>
                  <span><FiHeadphones /> Soporte humano real</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className={styles.heroVisual}>
                <HeroCarrusel />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== BARRA DE CONFIANZA ===== */}
        <section className={styles.cred}>
          <div className={`container ${styles.credInner}`}>
            {[
              [<FiUsers key="a" />, 'Proveedores reales y verificados'],
              [<FiTruck key="b" />, 'Datos para la importación'],
              [<FiShield key="c" />, 'Lista de estafas para no caer'],
              [<FiHeadphones key="d" />, 'Soporte por WhatsApp'],
            ].map(([ic, l], i) => (
              <div key={i} className={styles.credItem}>{ic}<span>{l}</span></div>
            ))}
          </div>
        </section>

        {/* ===== PROBLEMA / AGITACIÓN ===== */}
        <section className={styles.section}>
          <div className="container">
            <Reveal>
              <div className={styles.head}>
                <span className={styles.kicker}>La verdad incómoda</span>
                <h2 className={styles.h2}>Estás dejando dinero sobre la mesa</h2>
                <p className={styles.sub}>Mientras buscás proveedores en grupos de Facebook, otros ya están comprando directo de fábrica y vendiendo el doble.</p>
              </div>
            </Reveal>
            <div className={styles.problemGrid}>
              {[
                { icon: <FiUsers />, t: 'Comprás a intermediarios', d: 'Pagás de más porque comprás a quien ya compró antes. El margen se lo lleva otro.' },
                { icon: <FiEyeOff />, t: 'Caés en proveedores fake', d: 'Cuentas de Instagram que cobran seña y desaparecen. Ya lo viste mil veces.' },
                { icon: <FiClock />, t: 'Perdés horas buscando', d: 'Contactos que no responden o que no envían a Paraguay. Tiempo que es plata.' },
                { icon: <FiAlertTriangle />, t: 'Te arriesgás a estafas', d: 'Estafas de PIX, de flete y de productos que nunca llegan.' },
              ].map((p, i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <div className={styles.problemCard}>
                    <span className={styles.problemIcon}>{p.icon}</span>
                    <div><strong>{p.t}</strong><p>{p.d}</p></div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== COMPARACIÓN ANTES / DESPUÉS ===== */}
        <section className={styles.sectionAlt}>
          <Watermark words={['Comprás directo de fábrica', 'Ganás hasta 4x más']} />
          <div className="container">
            <Reveal>
              <div className={styles.head}>
                <span className={styles.kicker}>El cambio</span>
                <h2 className={styles.h2}>La diferencia entre adivinar y comprar como mayorista</h2>
              </div>
            </Reveal>
            <div className={styles.compare}>
              <Reveal>
                <div className={`${styles.compareCard} ${styles.compareBad}`}>
                  <span className={styles.compareTag}>Sin la plataforma</span>
                  <ul>
                    <li><FiX /> Comprás a intermediarios y pagás de más</li>
                    <li><FiX /> No sabés a qué fábrica ir</li>
                    <li><FiX /> Riesgo de estafa en cada compra</li>
                    <li><FiX /> Margen bajo, ganás poco</li>
                    <li><FiX /> Perdés viajes y tiempo</li>
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={0.12}>
                <div className={`${styles.compareCard} ${styles.compareGood}`}>
                  <span className={styles.compareTagGood}>Con Mayorista Brasil</span>
                  <ul>
                    <li><FiCheck /> Comprás directo de fábrica</li>
                    <li><FiCheck /> Mapa exacto: tienda, calle y horario</li>
                    <li><FiCheck /> Proveedores verificados, sin estafas</li>
                    <li><FiCheck /> Ganás hasta 4x más</li>
                    <li><FiCheck /> Datos de quienes traen tu mercadería a Paraguay</li>
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== RESULTADOS / LUCRO ===== */}
        <section className={styles.section}>
          <div className="container">
            <Reveal>
              <div className={styles.head}>
                <span className={styles.kicker}>El potencial</span>
                <h2 className={styles.h2}>Recuperás la inversión en tu primera compra</h2>
                <p className={styles.sub}>Ejemplos reales de margen comprando directo de fábrica.</p>
              </div>
            </Reveal>
            <div className={styles.profitGrid}>
              {[
                { p: 'Vestidos femeninos', c: 'R$ 25', v: 'Gs. 90.000', m: '+180%' },
                { p: 'Jeans premium', c: 'R$ 45', v: 'Gs. 150.000', m: '+150%' },
                { p: 'Conjuntos fitness', c: 'R$ 30', v: 'Gs. 110.000', m: '+200%' },
              ].map((x, i) => (
                <Reveal key={i} delay={i * 0.07}>
                  <div className={styles.profitCard}>
                    <h3>{x.p}</h3>
                    <div className={styles.profitRow}><span>Comprás de fábrica</span><strong>{x.c}</strong></div>
                    <div className={styles.profitRow}><span>Vendés en Paraguay</span><strong className={styles.green}>{x.v}</strong></div>
                    <div className={styles.profitMargen}>{x.m} de ganancia</div>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className={styles.note}>* Valores ilustrativos. El margen real depende del producto y de tu negociación.</p>
          </div>
        </section>

        {/* ===== CÓMO FUNCIONA ===== */}
        <section className={styles.sectionAlt}>
          <div className="container">
            <Reveal>
              <div className={styles.head}>
                <span className={styles.kicker}>Cómo funciona</span>
                <h2 className={styles.h2}>Empezás en 3 pasos</h2>
              </div>
            </Reveal>
            <div className={styles.steps}>
              {[
                { n: '01', t: 'Escribinos por WhatsApp', d: 'Te explicamos todo y resolvés tus dudas con una persona real.' },
                { n: '02', t: 'Activás tu acceso', d: 'Suscripción mensual por transferencia, Tigo Money, QR o billetera.' },
                { n: '03', t: 'Empezás a comprar', d: 'Entrás a la plataforma y contactás proveedores el mismo día.' },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <div className={styles.stepCard}>
                    <span className={styles.stepNum}>{s.n}</span>
                    <h3>{s.t}</h3>
                    <p>{s.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== QUÉ INCLUYE ===== */}
        <section id="incluye" className={styles.section}>
          <div className="container">
            <Reveal>
              <div className={styles.head}>
                <span className={styles.kicker}>Tu acceso incluye</span>
                <h2 className={styles.h2}>Todo lo que necesitás para comprar y revender</h2>
              </div>
            </Reveal>
            <div className={styles.featGrid}>
              {[
                { icon: <FiDollarSign />, t: 'Proveedores directos', d: 'Comprá al precio real de fábrica, sin intermediarios que te inflen el costo.' },
                { icon: <FiMap />, t: 'Mapa inteligente de compras', d: 'Calles, horarios, zonas seguras y dónde negociar mejor.' },
                { icon: <FiEyeOff />, t: 'Proveedores secretos', d: 'Fábricas y distribuidores que no aparecen en Google ni en redes.' },
                { icon: <FiTruck />, t: 'Datos para la importación', d: 'Contactos de transportadoras, redespacho y excursiones que traen tu mercadería a Paraguay.' },
                { icon: <FiTrendingUp />, t: 'Tendencias', d: 'Lo que más se vende cada semana y los productos con mayor margen.' },
                { icon: <FiShield />, t: 'Lista de estafas', d: 'Proveedores falsos y estafas conocidas, para que no pierdas plata.' },
              ].map((f, i) => (
                <Reveal key={i} delay={i * 0.04}>
                  <div className={styles.featCard}>
                    <span className={styles.featIcon}>{f.icon}</span>
                    <h3>{f.t}</h3>
                    <p>{f.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== DEMO / VIDEO ===== */}
        <section className={styles.sectionAlt}>
          <div className="container">
            <Reveal>
              <div className={styles.head}>
                <span className={styles.kicker}>Por dentro</span>
                <h2 className={styles.h2}>Una plataforma de verdad, no un PDF</h2>
                <p className={styles.sub}>Mirá cómo es por dentro y cómo encontrás proveedores en segundos.</p>
              </div>
            </Reveal>
            <div className={styles.demoWrap}>
              <Reveal><DashboardPreview /></Reveal>
              <Reveal delay={0.12}>
                <div className={styles.videoSlot}>
                  {config.videoTour
                    ? <video src={config.videoTour} className={styles.tourVideo} controls playsInline preload="metadata" />
                    : <ImgSlot label="Video de presentación (tour de la plataforma)" ratio="16/9" play />}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== PROVEEDORES DESTACADOS (TEASER) ===== */}
        <section id="proveedores" className={`${styles.section} ${styles.sectionPlain}`}>
          <Watermark
            words={todasLasCategorias}
            opacity={0.13}
            horizontal
            small
            solid
            colorPerWord
            rows={16}
          />
          <div className="container">
            <Reveal>
              <div className={`${styles.head} ${styles.headWm}`}>
                <span className={styles.kicker}>Adentro te espera</span>
                <h2 className={styles.h2}>+{nProv.toLocaleString('es-PY')} proveedores listos para contactar</h2>
                <p className={styles.sub}>
                  {preview.length > 0
                    ? <>Una muestra <strong>gratis</strong> — tocá para ver el contacto. Suscribite para acceder a los +{nProv.toLocaleString('es-PY')}.</>
                    : 'Esto es solo una muestra — el acceso desbloquea todo.'}
                </p>
              </div>
            </Reveal>
            <div className={styles.previewGrid}>
              {preview.map((p, i) => (
                <Reveal key={p.nombre + i} delay={Math.min(i * 0.04, 0.3)}>
                  <button type="button" className={styles.previewCard} onClick={() => setPreviewSel(i)}>
                    <div className={styles.previewThumb}>
                      <Foto src={p.foto} alt={p.nombre} lazy
                        fallback={<span className={styles.previewAvatar}>{p.nombre.charAt(0)}</span>} />
                      <span className={styles.previewFree}>Gratis</span>
                    </div>
                    <div className={styles.previewBody}>
                      <strong>{sinBras(p.nombre)}</strong>
                      <span className={styles.previewCat}>{p.categoria}</span>
                      {p.direccion && <span className={styles.previewDir}>{sinBras(p.direccion)}</span>}
                      <span className={styles.previewVer}>Ver contacto <FiArrowRight size={13} /></span>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
            <div className={styles.centerCta}>
              <Link href="/registro" className="btn btn-primary" style={{ fontSize: 16, padding: '15px 28px' }}>
                Acceder ahora <FiArrowRight />
              </Link>
            </div>
          </div>
        </section>

        {/* ===== RUBROS / CATEGORÍAS DISPONIBLES ===== */}
        {nGrupos > 0 && (
          <section id="categorias" className={styles.sectionAlt}>
            <div className="container">
              <Reveal>
                <div className={styles.head}>
                  <span className={styles.kicker}>No es solo ropa</span>
                  <h2 className={styles.h2}>{nGrupos} rubros para revender</h2>
                  <p className={styles.sub}>Moda es solo el comienzo. Elegí el rubro que más te conviene y encontrá proveedores directos.</p>
                </div>
              </Reveal>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 900, margin: '0 auto' }}>
                {stats.grupos.map((g, i) => (
                  <Reveal key={g.nombre} delay={Math.min(i * 0.03, 0.3)}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '11px 18px', borderRadius: 999,
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      fontSize: 14, fontWeight: 600,
                    }}>
                      {g.nombre}
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--br-verde)' }}>{g.total}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ===== PRUEBA SOCIAL ===== */}
        {/* Si la sección de rubros no se muestra, ésta toma el fondo alterno
            para que nunca queden dos secciones iguales seguidas. */}
        <section className={nGrupos > 0 ? styles.section : styles.sectionAlt}>
          <div className="container">
            <Reveal>
              <div className={styles.head}>
                <span className={styles.kicker}>Lo que dicen</span>
                <h2 className={styles.h2}>Revendedores que ya compran con nosotros</h2>
              </div>
            </Reveal>
            <div className={styles.testiGrid}>
              {config.testimonios.map((t, i) => (
                <Reveal key={i} delay={i * 0.06}>
                  <div className={styles.testiCard}>
                    <div className={styles.stars}>{Array.from({ length: 5 }).map((_, k) => <FiStar key={k} fill="currentColor" />)}</div>
                    <p>“{sinBras(t.texto)}”</p>
                    <div className={styles.testiAuthor}>
                      <span className={styles.testiAvatar}>{t.nombre.charAt(0)}</span>
                      <div><strong>{t.nombre}</strong><span>{t.ciudad}</span></div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className={styles.proofShots}>
              {config.proofShots.map((url, i) => (
                url
                  ? <img key={i} src={url} className={styles.proofImg} alt={`Prueba ${i + 1}`} />
                  : <ImgSlot key={i} label={['Print de WhatsApp', 'Foto de compra', 'Resultado de venta', 'Agradecimiento'][i] || 'Print'} ratio="9/16" small />
              ))}
            </div>
          </div>
        </section>

        {/* ===== CONFIANZA / ANTI-ESTAFA ===== */}
        <section className={styles.sectionAlt}>
          <div className="container">
            <Reveal>
              <div className={styles.head}>
                <span className={styles.kicker}>Confianza</span>
                <h2 className={styles.h2}>Sabemos que hay mucha estafa. Por eso hacemos las cosas diferente.</h2>
              </div>
            </Reveal>
            <div className={styles.trustGrid}>
              {[
                { icon: <FiCheck />, t: 'Proveedores verificados', d: 'Cada contacto pasa por revisión antes de entrar a la plataforma.' },
                { icon: <FiMap />, t: 'Hecho para Paraguay', d: 'Pensado para revendedores paraguayos, no contenido genérico.' },
                { icon: <FiRefreshCw />, t: 'Se actualiza siempre', d: 'Agregamos proveedores nuevos y sacamos los que dejan de servir.' },
                { icon: <FiHeadphones />, t: 'Soporte humano', d: 'Hablás con una persona real por WhatsApp, no con un robot.' },
                { icon: <FiShield />, t: 'Te protegemos', d: 'Lista activa de proveedores falsos y estafas conocidas.' },
                { icon: <FiLock />, t: 'Suscripción flexible', d: 'Cancelás cuando quieras. Sin permanencia obligatoria.' },
              ].map((x, i) => (
                <Reveal key={i} delay={i * 0.04}>
                  <div className={styles.trustCard}>
                    <span className={styles.trustIcon}>{x.icon}</span>
                    <div><strong>{x.t}</strong><p>{x.d}</p></div>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal>
              <div className={styles.pagos}>
                <span>Métodos de pago aceptados en Paraguay</span>
                <div className={styles.pagoLogos}>
                  {['Bancard', 'Tigo Money', 'Personal Pay', 'Ueno', 'Continental', 'QR', 'Transferencia'].map(p => (
                    <span key={p} className={styles.pagoChip}>{p}</span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== BONOS ===== */}
        <section className={styles.section}>
          <div className="container">
            <Reveal>
              <div className={styles.head}>
                <span className={styles.kicker}>De regalo</span>
                <h2 className={styles.h2}>+ 4 bonos exclusivos al activar hoy</h2>
              </div>
            </Reveal>
            <div className={styles.bonosGrid}>
              {[
                'Lista de 50 proveedores con envío directo por WhatsApp',
                'Plantillas de mensajes para negociar precios',
                'Cómo empezar la reventa con poco dinero',
                'Calendario de las mejores épocas para comprar',
              ].map((b, i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <div className={styles.bonoCard}>
                    <span className={styles.bonoNum}><FiGift /> BONO {i + 1}</span>
                    <p>{b}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== OFERTA / PRECIO ===== */}
        <section id="precio" className={styles.sectionAlt}>
          <div className="container">
            <Reveal>
              <div className={styles.priceCard}>
                <div className={styles.priceGlow} />
                <span className={styles.priceBadge}><FiAward /> Suscripción mensual</span>
                <h2 className={styles.h2} style={{ fontSize: 26 }}>Activá tu acceso a Mayorista Brasil</h2>
                <ul className={styles.priceList}>
                  {['Proveedores directos de fábrica', 'Mapa inteligente + proveedores secretos', 'Datos para la importación', 'Tendencias y lista de estafas', '4 bonos exclusivos', 'Plataforma actualizada constantemente', 'Soporte por WhatsApp'].map(x => (
                    <li key={x}><FiCheck /> {x}</li>
                  ))}
                </ul>
                <div className={styles.priceNumbers}>
                  <span className={styles.priceOld}>{fmt(PRECIO_NORMAL_GS)}/mes</span>
                  <span className={styles.priceNew}>{fmt(PRECIO_GS)}<span style={{ fontSize: '0.4em', color: 'var(--text-mut)', fontWeight: 500, marginLeft: 8 }}>/mes</span></span>
                </div>
                <span className={styles.priceSub}>precio promocional de lanzamiento · cancelás cuando quieras</span>
                <Link href="/registro" className="btn btn-primary" style={{ width: '100%', fontSize: 17, padding: '17px 32px', marginTop: 18 }}>
                  Suscribirme ahora <FiArrowRight />
                </Link>
                <a href="#faq" className={styles.altLink}>o ver preguntas frecuentes →</a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" className={styles.section}>
          <div className="container" style={{ maxWidth: 760 }}>
            <Reveal>
              <div className={styles.head}>
                <span className={styles.kicker}>FAQ</span>
                <h2 className={styles.h2}>Preguntas frecuentes</h2>
              </div>
            </Reveal>
            <div className={styles.faq}>
              <Faq q="¿Esto es una estafa?" a="Entendemos la duda. Te atendemos por WhatsApp con una persona real, verificamos cada proveedor e incluimos una lista de estafas conocidas. Podés cancelar la suscripción cuando quieras — sin permanencia obligatoria. Apenas confirmás el pago, recibís acceso completo." />
              <Faq q="¿Los proveedores son reales?" a="Sí. Cada contacto pasa por revisión antes de entrar y sacamos los que dejan de funcionar. La base se actualiza constantemente." />
              <Faq q="¿Necesito viajar a Brasil?" a="No es obligatorio. Muchos proveedores envían a Paraguay y te damos los datos de las transportadoras y servicios de redespacho que traen la mercadería. Pero si viajás, el mapa de compras te va a servir muchísimo." />
              <Faq q="¿En cuánto recupero la inversión?" a="La mayoría recupera el costo del acceso en su primera compra, por la diferencia de precio al comprar directo de fábrica." />
              <Faq q="¿Puedo cancelar?" a="Sí, en cualquier momento y sin permanencia obligatoria. Mientras la suscripción esté activa tenés acceso completo y a todas las actualizaciones que agreguemos." />
              <Faq q="¿Sirve si recién empiezo?" a="Sí. Incluimos una guía para empezar con poco dinero y plantillas de negociación. Es ideal para principiantes." />
            </div>
          </div>
        </section>

        {/* ===== CTA FINAL ===== */}
        <section className={styles.finalCta}>
          <div className={styles.finalGlow} />
          <Watermark />
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <Reveal>
              <h2 className={styles.h2} style={{ fontSize: 40 }}>Empezá hoy tu negocio de reventa</h2>
              <p className={styles.sub} style={{ marginBottom: 28 }}>Acceso inmediato · {fmt(PRECIO_GS)}/mes · soporte humano</p>
              <Link href="/registro" className="btn" style={{ fontSize: 17, padding: '17px 36px', background: '#fff', color: 'var(--rojo)', fontWeight: 800, boxShadow: '0 12px 34px -10px rgba(0,0,0,.35)' }}>
                Acceder ahora <FiArrowRight />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className={styles.footer}>
          <div className={`container ${styles.footerInner}`}>
            <Link href="/" className={styles.brand}>
              <span className={styles.brandMark}>M</span>
              <span className={styles.brandText}>Mayorista <span>Brasil</span></span>
            </Link>
            <p>© {new Date().getFullYear()} Mayorista Brasil · Plataforma privada para revendedores.</p>
            <a href="#faq" className={styles.footerWpp}>Preguntas frecuentes</a>
          </div>
        </footer>

        {/* ===== STICKY MOBILE CTA ===== */}
        <Link href="/registro" className={styles.stickyCta}>
          Acceder ahora <FiArrowRight size={18} />
        </Link>

        {/* ===== POPUP VISTA PREVIA ===== */}
        {previewSel !== null && preview[previewSel] && (() => {
          const p = preview[previewSel];
          return (
            <div className={styles.pvOverlay} onClick={() => setPreviewSel(null)}>
              <div className={styles.pvModal} onClick={e => e.stopPropagation()}>
                <button className={styles.pvClose} onClick={() => setPreviewSel(null)} aria-label="Cerrar"><FiX /></button>
                <div className={styles.pvThumb}>
                  <Foto src={p.foto} alt={p.nombre}
                    fallback={<span className={styles.previewAvatar}>{p.nombre.charAt(0)}</span>} />
                  <span className={styles.previewFree}>Gratis</span>
                </div>
                <div className={styles.pvBody}>
                  <span className={styles.previewCat}>{p.categoria}</span>
                  <h3>{sinBras(p.nombre)}</h3>
                  {p.direccion && <p className={styles.pvDir}><FiMap /> {sinBras(p.direccion)}</p>}
                  {p.observaciones && <p className={styles.pvObs}>{sinBras(p.observaciones)}</p>}
                  <div className={styles.pvLinks}>
                    {p.whatsapp && (
                      <a href={`https://wa.me/${p.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className={styles.previewWpp}>WhatsApp</a>
                    )}
                    {p.instagram && (
                      <a href={igUrl(p.instagram)} target="_blank" rel="noreferrer" className={styles.previewIg}>Instagram</a>
                    )}
                  </div>
                  <Link href="/registro" className="btn btn-primary" style={{ width: '100%', marginTop: 6 }}>
                    Ver los +{nProv.toLocaleString('es-PY')} proveedores <FiArrowRight />
                  </Link>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}

function ImgSlot({ label, ratio, play, small }: { label: string; ratio: string; play?: boolean; small?: boolean }) {
  return (
    <div className={`${styles.imgSlot} ${small ? styles.imgSlotSmall : ''}`} style={{ aspectRatio: ratio }}>
      {play ? <span className={styles.playBtn}><FiPlay /></span> : <FiImage />}
      <span className={styles.imgLabel}>{label}</span>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${styles.faqItem} ${open ? styles.faqOpen : ''}`}>
      <button onClick={() => setOpen(!open)} className={styles.faqQ}>
        <span>{q}</span><FiChevronDown />
      </button>
      {open && <p className={styles.faqA}>{a}</p>}
    </div>
  );
}
