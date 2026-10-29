import Head from 'next/head';
import { FaMapMarkedAlt } from 'react-icons/fa';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import DashboardLayout from '@/components/DashboardLayout';
import SeccionContenido from '@/components/SeccionContenido';

export default function Mapa() {
  const { authorized, loading } = usePagoGuard();
  if (loading || !authorized) return null;
  return (
    <DashboardLayout>
      <Head><title>Mapa de Brás — Mayorista Brasil</title></Head>
      <SeccionContenido
        seccionId="mapa"
        titulo="Mapa Estratégico de Brás"
        descripcion="Calles, horarios, zonas seguras, dónde comer y cómo negociar"
        icon={<FaMapMarkedAlt />}
      />
    </DashboardLayout>
  );
}
