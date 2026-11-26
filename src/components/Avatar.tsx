import { ReactNode } from 'react';
import {
  PiCatFill, PiDogFill, PiBirdFill, PiFishFill, PiRabbitFill, PiButterflyFill, PiHorseFill, PiCowFill, PiShrimpFill,
  PiBugBeetleFill, PiPawPrintFill, PiUserFill, PiStudentFill, PiDetectiveFill, PiBabyFill, PiSmileyFill, PiSmileyWinkFill,
  PiCowboyHatFill, PiChefHatFill, PiRobotFill, PiAlienFill, PiGhostFill, PiStarFill, PiHeartFill, PiLightningFill, PiSunFill,
  PiMoonFill, PiDiamondFill, PiCrownFill, PiRocketFill, PiFireFill, PiAnchorFill, PiFeatherFill, PiLeafFill, PiFlowerLotusFill,
  PiCactusFill, PiTreePalmFill, PiPlanetFill, PiMusicNotesFill, PiCoffeeFill, PiPizzaFill, PiIceCreamFill, PiCherriesFill, PiAvocadoFill,
} from 'react-icons/pi';
import { FaFrog, FaHippo, FaKiwiBird, FaOtter, FaDove, FaCrow, FaDragon, FaUserAstronaut, FaUserNinja, FaUserTie, FaUserNurse, FaFemale, FaMale } from 'react-icons/fa';
import { CORES, lerAvatar, avatarAleatorio } from '@/lib/avatar';
import styles from './Avatar.module.css';

export const ICONES: Record<string, ReactNode> = {
  gato: <PiCatFill />, perro: <PiDogFill />, pajaro: <PiBirdFill />, pez: <PiFishFill />, conejo: <PiRabbitFill />,
  mariposa: <PiButterflyFill />, caballo: <PiHorseFill />, vaca: <PiCowFill />, camaron: <PiShrimpFill />,
  escarabajo: <PiBugBeetleFill />, huella: <PiPawPrintFill />, rana: <FaFrog />, hipopotamo: <FaHippo />, kiwi: <FaKiwiBird />,
  nutria: <FaOtter />, paloma: <FaDove />, cuervo: <FaCrow />, dragon: <FaDragon />,
  persona: <PiUserFill />, estudiante: <PiStudentFill />, detective: <PiDetectiveFill />, bebe: <PiBabyFill />,
  sonrisa: <PiSmileyFill />, guino: <PiSmileyWinkFill />, astronauta: <FaUserAstronaut />, ninja: <FaUserNinja />,
  ejecutivo: <FaUserTie />, enfermera: <FaUserNurse />, mujer: <FaFemale />, hombre: <FaMale />, vaquero: <PiCowboyHatFill />,
  chef: <PiChefHatFill />, robot: <PiRobotFill />, alien: <PiAlienFill />, fantasma: <PiGhostFill />,
  estrella: <PiStarFill />, corazon: <PiHeartFill />, rayo: <PiLightningFill />, sol: <PiSunFill />, luna: <PiMoonFill />,
  diamante: <PiDiamondFill />, corona: <PiCrownFill />, cohete: <PiRocketFill />, fuego: <PiFireFill />, ancla: <PiAnchorFill />,
  pluma: <PiFeatherFill />, hoja: <PiLeafFill />, loto: <PiFlowerLotusFill />, cactus: <PiCactusFill />, palmera: <PiTreePalmFill />,
  planeta: <PiPlanetFill />, musica: <PiMusicNotesFill />, cafe: <PiCoffeeFill />, pizza: <PiPizzaFill />, helado: <PiIceCreamFill />,
  cerezas: <PiCherriesFill />, palta: <PiAvocadoFill />,
};

/**
 * Avatar minimalista. `valor` = "forma.color.figura"; si falta o es inválido,
 * usa uno estable derivado de `clave` (uid o apodo).
 */
export default function Avatar({ valor, clave = '', size = 36, className }: { valor?: string | null; clave?: string; size?: number; className?: string }) {
  const p = lerAvatar(valor) || lerAvatar(avatarAleatorio(clave || 'x'))!;
  const c = CORES.find(x => x.id === p.cor)!;
  return (
    <span
      className={`${styles.av} ${styles['f_' + p.forma]} ${className || ''}`}
      style={{ width: size, height: size, fontSize: size * (p.forma === 'rombo' ? .42 : .52), background: `linear-gradient(135deg, ${c.a}, ${c.b})` }}
      aria-hidden
    >
      {ICONES[p.figura]}
    </span>
  );
}
