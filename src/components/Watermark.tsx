import styles from './Watermark.module.css';

type Props = {
  /** Frases/palabras a mostrar. Se reparten entre las filas, sin repetir. */
  words?: string[];
  /** Si se pasa, el contorno de cada fila cicla por estos colores. */
  colors?: string[];
  /** Opacidad de las filas (por defecto la del CSS). */
  opacity?: number;
  /** Sin inclinación: filas horizontales que llenan toda la sección. */
  horizontal?: boolean;
  /** Texto ~50% más chico. */
  small?: boolean;
  /** Cantidad de filas (por defecto 7). */
  rows?: number;
  /** Letras rellenas en vez de sólo contorno. */
  solid?: boolean;
  /** Color animado e independiente para CADA palabra (rojo/verde/azul). */
  colorPerWord?: boolean;
};

// Marca de agua tipográfica en movimiento: texto tenue deslizándose + un brillo
// que barre. Decorativa, detrás del contenido.
export default function Watermark({
  words = ['MAYORISTA BRASIL'], colors, opacity, horizontal, small, rows = 7, solid, colorPerWord,
}: Props) {
  // Sin duplicados y sin vacíos
  const lista = Array.from(new Set(words.map(w => (w || '').trim()).filter(Boolean)));
  const finales = lista.length ? lista : ['MAYORISTA BRASIL'];

  // Reparte las palabras entre las filas (cada palabra aparece una sola vez)
  const porFila = Math.ceil(finales.length / rows);
  const filas = Array.from({ length: rows }, (_, i) => {
    const trozo = finales.slice(i * porFila, (i + 1) * porFila);
    return trozo.length ? trozo : finales;
  });
  // Sólo se repite el contenido si hay muy pocas palabras para llenar la fila
  const hayDeSobra = finales.length >= rows * 2;

  const contenido = (trozo: string[], filaIdx: number) => {
    const base = trozo.map((w, j) => (
      <span
        key={`${filaIdx}-${j}`}
        className={colorPerWord ? styles.word : undefined}
        // desfase distinto por palabra → cada una cambia de color en su propio tiempo
        style={colorPerWord ? { animationDelay: `${-((filaIdx * 7 + j) % 12) * 0.9}s` } : undefined}
      >
        {w}
        <i className={styles.sep}> · </i>
      </span>
    ));
    if (hayDeSobra) return base;
    const veces = Math.max(1, Math.ceil(70 / trozo.join(' · ').length));
    return Array.from({ length: veces }, () => base).flat();
  };

  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={`${styles.rows} ${horizontal ? styles.horiz : ''}`}>
        {filas.map((trozo, i) => (
          <div
            key={i}
            className={`${styles.row} ${i % 2 ? styles.rev : ''} ${small ? styles.small : ''} ${solid ? styles.solid : ''}`}
            style={{
              animationDuration: `${70 + i * 10}s`,
              ...(colors && !colorPerWord ? { WebkitTextStrokeColor: colors[i % colors.length] } : {}),
              ...(opacity !== undefined ? { opacity } : {}),
            }}
          >
            <span className={styles.seq}>{contenido(trozo, i)}</span>
            <span className={styles.seq}>{contenido(trozo, i + 100)}</span>
          </div>
        ))}
      </div>
      <div className={styles.sheen} />
    </div>
  );
}
