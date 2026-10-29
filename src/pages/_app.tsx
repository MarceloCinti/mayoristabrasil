import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  // Captura el código de referido del link (?ref=CODIGO) y lo guarda hasta el registro
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) localStorage.setItem('mb_ref', ref.trim());
    } catch { /* noop */ }
  }, []);

  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#181c24',
            color: '#e8eaf2',
            border: '1px solid #2a3142',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#12803B', secondary: '#0f1115' } },
          error: { iconTheme: { primary: '#d52b1e', secondary: '#0f1115' } },
        }}
      />
    </AuthProvider>
  );
}
