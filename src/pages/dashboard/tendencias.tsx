import Head from 'next/head';
import { FaFire } from 'react-icons/fa';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import DashboardLayout from '@/components/DashboardLayout';
import SeccionContenido from '@/components/SeccionContenido';

export default function Tendencias() {
  const { authorized, loading } = usePagoGuard();
  if (loading || !authorized) return null;
  return (
    <DashboardLayout>
      <Head><title>Tendencias — Mayorista Brasil</title></Head>
      <SeccionContenido
        seccionId="tendencias"
        titulo="Tendencias de la Semana"
        descripcion="Lo que más vende, modelos virales y productos con mayor margen"
        icon={<FaFire />}
      />
    </DashboardLayout>
  );
}
