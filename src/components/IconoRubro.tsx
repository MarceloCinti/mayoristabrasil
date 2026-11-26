/**
 * Íconos propios del Diccionario del Negociador (Bono 2).
 * Dibujo de línea, un solo color (hereda `color`, por defecto negro), sin
 * relleno — mismo trazo en todos para que se vean como una familia.
 */
const TRAZOS: Record<string, JSX.Element> = {
  // Paso a paso: recorrido de un punto a otro
  'paso-a-paso': (<>
    <circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" />
    <path d="M8 18h7.5a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6H16" />
  </>),
  // Moda: percha
  moda: (<>
    <path d="M10 6.5a2 2 0 1 1 2.6 1.9c-.4.1-.6.5-.6.9V11" />
    <path d="M12 11 3.4 17.2c-.8.6-.4 1.8.6 1.8h16c1 0 1.4-1.2.6-1.8Z" />
  </>),
  // Cosméticos: labial
  belleza: (<>
    <path d="M8.5 21h7v-8h-7Z" /><path d="M9.5 13V9.5h5V13" />
    <path d="M10.5 9.5V5.2l3-2.2v6.5" />
  </>),
  // Casa
  casa: (<>
    <path d="m3 11 9-7 9 7" /><path d="M5.5 9.2V20h13V9.2" /><path d="M10 20v-5.5h4V20" />
  </>),
  // Construcción: llave
  construccion: (<>
    <path d="M14.7 3.3a5 5 0 0 0-5.9 6.5l-5.2 5.3a2.1 2.1 0 1 0 3 3l5.3-5.2a5 5 0 0 0 6.5-5.9l-3 3-2.6-.5-.5-2.6Z" />
  </>),
  // Automotor: auto
  automotor: (<>
    <path d="M3.5 16.5V12l2.3-5h12.4l2.3 5v4.5" /><path d="M3.5 12h17" />
    <path d="M3.5 16.5h1.6M9 16.5h6M18.9 16.5h1.6" />
    <circle cx="7" cy="16.5" r="2" /><circle cx="17" cy="16.5" r="2" />
  </>),
  // Electrónicos: celular
  electronica: (<>
    <rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" />
  </>),
  // Bebés y fiestas: sonajero
  bebes: (<>
    <circle cx="9" cy="8.5" r="4.5" /><path d="M12.2 11.7 18 17.5" /><circle cx="19" cy="18.5" r="1.6" />
    <path d="M7 7.5a2.2 2.2 0 0 1 2-1.3" />
  </>),
  // Papelería y embalajes: caja
  papeleria: (<>
    <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z" /><path d="m3 7.5 9 4.5 9-4.5" /><path d="M12 12v9" />
    <path d="m7.5 5.3 9 4.5" />
  </>),
  // Gastronomía: gorro de chef
  gastronomia: (<>
    <path d="M7 14a3.8 3.8 0 1 1 1.4-7.4 4.3 4.3 0 0 1 7.2 0A3.8 3.8 0 1 1 17 14" />
    <path d="M7 13v7h10v-7" /><path d="M7 17h10" />
  </>),
  // Agro: brote
  agro: (<>
    <path d="M12 21v-9" /><path d="M12 13.5C12 9.7 9.4 7.5 5 7.5c0 3.8 2.6 6 7 6" />
    <path d="M12 11.5c0-3.8 2.6-6 7-6 0 3.8-2.6 6-7 6" /><path d="M8 21h8" />
  </>),
  // Conversación completa
  conversacion: (<>
    <path d="M3.5 4.5h11v8H8l-4.5 3.5Z" /><path d="M14.5 8.5h6v8.5L17 14.5h-6v-2" />
  </>),
  // Glosario: libro
  glosario: (<>
    <path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2Z" /><path d="M5 20a2 2 0 0 0 2 1h12v-3" />
    <path d="M9 7.5h6M9 10.5h4" />
  </>),
};

export default function IconoRubro({ id, size = 20, className }: { id: string; size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden className={className}
    >
      {TRAZOS[id] || TRAZOS['paso-a-paso']}
    </svg>
  );
}
