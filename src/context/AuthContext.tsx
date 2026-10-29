'use client';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, ADMIN_EMAIL } from '@/lib/firebase';

interface UserData {
  uid: string;
  email: string | null;
  nombre: string;
  pago: boolean;
  fechaCompra: any;
  esAdmin: boolean;
  createdAt: any;
  // Afiliados
  esAfiliado?: boolean;
  codigoAfiliado?: string | null;   // código propio si es afiliado
  comisionPorcentaje?: number;      // % que gana por referido
  afiliadoDesde?: any;              // cuándo se activó como afiliado
  afiliadoVistoPorAdmin?: boolean;  // para la notificación del admin
  referidoPor?: string | null;      // código del afiliado que lo refirió
  montoPagado?: number;             // monto que pagó (se setea al confirmar)
  comisionLiquidada?: boolean;      // si ya se le pagó al afiliado por este referido
  // Perfil (cadastro en pasos)
  whatsapp?: string;
  whatsappVerificado?: boolean;
  departamento?: string;
  ciudad?: string;
  comercio?: string;                // nombre del local / comercio
  profesion?: string;
  fechaNacimiento?: string;         // YYYY-MM-DD
  genero?: string;
  perfilCompleto?: boolean;
  // Estado de cuenta
  archivado?: boolean;
  mustChangePassword?: boolean;
  // Plan / suscripción
  tipoPlan?: 'unico' | 'mensual';   // pago único o suscripción mensual
  vip?: boolean;                    // marca VIP
  suscripcionVence?: string;        // YYYY-MM-DD (renovación de la mensual)
  // Cuentas bancarias del afiliado (hasta 2)
  cuentasBancarias?: { banco: string; nombreCompleto: string; ci: string; nroCuenta: string }[];
  // Acceso de prueba: secciones distintas ya visitadas (ver src/lib/trial.ts)
  trialVistas?: string[];
  // Aviso de "ya transferí": el admin confirma el comprobante y libera
  pagoPendiente?: boolean;
  pagoMetodo?: 'transferencia' | 'hotmart';
  pagoSolicitadoEn?: any;
}

// Lee el código de referido guardado al entrar por un link ?ref=
function getRefCode(): string | null {
  try { return localStorage.getItem('mb_ref') || null; } catch { return null; }
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  register: (email: string, password: string, nombre: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const justRegistered = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        if (justRegistered.current) {
          justRegistered.current = false;
          setLoading(false);
          return;
        }
        await new Promise(r => setTimeout(r, 300));
        const snap = await getDoc(doc(db, 'usuarios', u.uid));
        if (snap.exists()) {
          setUserData(snap.data() as UserData);
        } else {
          const data: UserData = {
            uid: u.uid,
            email: u.email,
            nombre: u.displayName || 'Usuario',
            pago: false,
            fechaCompra: null,
            esAdmin: u.email === ADMIN_EMAIL,
            createdAt: serverTimestamp(),
            referidoPor: getRefCode(),
          };
          await setDoc(doc(db, 'usuarios', u.uid), data);
          setUserData(data);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') throw err;
    }
  };

  const register = async (email: string, password: string, nombre: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const data: UserData = {
      uid: cred.user.uid,
      email: cred.user.email,
      nombre,
      pago: false,
      fechaCompra: null,
      esAdmin: cred.user.email === ADMIN_EMAIL,
      createdAt: serverTimestamp(),
      referidoPor: getRefCode(),
    };
    await setDoc(doc(db, 'usuarios', cred.user.uid), data);
    setUserData(data);
    justRegistered.current = true;
  };

  const logout = () => signOut(auth);

  const refreshUserData = async () => {
    if (!auth.currentUser) return;
    const snap = await getDoc(doc(db, 'usuarios', auth.currentUser.uid));
    if (snap.exists()) setUserData(snap.data() as UserData);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, loginEmail, loginGoogle, register, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
