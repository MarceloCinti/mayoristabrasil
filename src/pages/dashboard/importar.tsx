import Head from 'next/head';
import { FaTruck } from 'react-icons/fa';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import DashboardLayout from '@/components/DashboardLayout';
import SeccionContenido from '@/components/SeccionContenido';

export default function Importar() {
  const { authorized, loading } = usePagoGuard();
  if (loading || !authorized) return null;
  return (
    <DashboardLayout>
      <Head><title>Datos para la importación — Mayorista Brasil</title></Head>
      <SeccionContenido
        seccionId="importar"
        titulo="Datos para la Importación"
        descripcion="Contactos de transportadoras, redespacho y excursiones que traen tu mercadería del Brás a Paraguay"
        icon={<FaTruck />}
      />
    </DashboardLayout>
  );
}
