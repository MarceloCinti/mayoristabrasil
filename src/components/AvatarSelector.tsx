import { useState } from 'react';
import { FiShuffle } from 'react-icons/fi';
import Avatar, { ICONES } from './Avatar';
import { CORES, FIGURAS, FORMAS, lerAvatar, montarAvatar, avatarAleatorio, avatarDe } from '@/lib/avatar';
import styles from './AvatarSelector.module.css';

const GRUPOS = [
  { id: 'animales', label: 'Animales' },
  { id: 'personas', label: 'Personas' },
  { id: 'simbolos', label: 'Símbolos' },
] as const;

/** Elegir formato, color y figura. `valor` = "forma.color.figura". */
export default function AvatarSelector({ valor, clave, onChange }: { valor: string; clave: string; onChange: (v: string) => void }) {
  const atual = lerAvatar(avatarDe(valor, clave))!;
  const [grupo, setGrupo] = useState<(typeof GRUPOS)[number]['id']>(
    (GRUPOS.find(g => (FIGURAS[g.id] as readonly string[]).includes(atual.figura))?.id) || 'animales',
  );
  const set = (parte: Partial<typeof atual>) => onChange(montarAvatar({ ...atual, ...parte }));

  return (
    <div className={styles.sel}>
      <div className={styles.topo}>
        <Avatar valor={montarAvatar(atual)} size={84} className={styles.grande} />
        <button type="button" className={styles.sorteio} onClick={() => onChange(avatarAleatorio(String(Math.random())))}>
          <FiShuffle /> Sorpresa
        </button>
      </div>

      <div className={styles.titulo}>Formato</div>
      <div className={styles.linha}>
        {FORMAS.map(f => (
          <button type="button" key={f.id} title={f.label} className={`${styles.op} ${atual.forma === f.id ? styles.on : ''}`} onClick={() => set({ forma: f.id })}>
            <Avatar valor={montarAvatar({ ...atual, forma: f.id })} size={34} />
          </button>
        ))}
      </div>

      <div className={styles.titulo}>Color</div>
      <div className={styles.linha}>
        {CORES.map(c => (
          <button type="button" key={c.id} title={c.id} className={`${styles.cor} ${atual.cor === c.id ? styles.on : ''}`}
            style={{ background: `linear-gradient(135deg, ${c.a}, ${c.b})` }} onClick={() => set({ cor: c.id })} />
        ))}
      </div>

      <div className={styles.titulo}>
        Figura
        <span className={styles.abas}>
          {GRUPOS.map(g => (
            <button type="button" key={g.id} className={grupo === g.id ? styles.abaOn : ''} onClick={() => setGrupo(g.id)}>{g.label}</button>
          ))}
        </span>
      </div>
      <div className={styles.figuras}>
        {(FIGURAS[grupo] as readonly string[]).map(f => (
          <button type="button" key={f} className={`${styles.fig} ${atual.figura === f ? styles.on : ''}`} onClick={() => set({ figura: f })}>
            {ICONES[f]}
          </button>
        ))}
      </div>
    </div>
  );
}
