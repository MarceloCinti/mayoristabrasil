import { useCallback, useRef } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { trialAgotado, nuevoMarcadorClic } from '@/lib/trial';

/**
 * Devuelve una función para gastar UN clic de la prueba.
 *
 * Quien pagó o es admin no gasta nada. El guardado va a Firestore (así no se
 * resetea cambiando de navegador), pero el bloqueo de pantalla no espera a la
 * red: quien llama actualiza su contador local al instante.
 */
export function useContadorClics() {
  const { user, userData, refreshUserData } = useAuth();
  // Evita contar dos veces el mismo clic si un evento burbujea más de una vez.
  const ultimoClic = useRef(0);

  return useCallback((): boolean => {
    if (!user || !userData) return false;
    if (userData.pago || userData.esAdmin) return false;   // acceso completo
    if (trialAgotado(userData)) return false;              // ya no queda

    const ahora = Date.now();
    if (ahora - ultimoClic.current < 250) return false;    // mismo clic repetido
    ultimoClic.current = ahora;

    (async () => {
      try {
        await updateDoc(doc(db, 'usuarios', user.uid), {
          trialVistas: arrayUnion(nuevoMarcadorClic()),
        });
        await refreshUserData();
      } catch (err) {
        console.error('No se pudo registrar el clic de prueba', err);
      }
    })();

    return true; // sí consumió un clic
  }, [user, userData, refreshUserData]);
}
