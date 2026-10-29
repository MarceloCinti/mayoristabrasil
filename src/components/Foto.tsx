import { ReactNode, useState, useEffect } from 'react';

interface Props {
  src?: string;
  alt: string;
  className?: string;
  /** Qué mostrar si no hay foto o si la URL falla. */
  fallback: ReactNode;
  lazy?: boolean;
}

/**
 * Imagen con respaldo.
 *
 * Muchas fotos de proveedores son URLs de Google Maps traídas por el import de
 * Outscraper, y Google las caduca: hoy devuelven 403. Sin esto, la tarjeta
 * muestra el ícono de imagen rota con el texto alternativo encima, que es peor
 * que no mostrar nada. Acá, si la URL falla, cae al placeholder.
 */
export default function Foto({ src, alt, className, fallback, lazy }: Props) {
  const [falló, setFalló] = useState(false);

  // Si cambia la URL (p. ej. el carrusel de la tarjeta), volvemos a intentar.
  useEffect(() => { setFalló(false); }, [src]);

  if (!src || falló) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={lazy ? 'lazy' : undefined}
      onError={() => setFalló(true)}
    />
  );
}
