import Head from 'next/head';
import { FaShieldAlt } from 'react-icons/fa';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import DashboardLayout from '@/components/DashboardLayout';
import SeccionContenido from '@/components/SeccionContenido';

export default function Estafas() {
  const { authorized, loading } = usePagoGuard();
  if (loading || !authorized) return null;
  return (
    <DashboardLayout>
      <Head><title>Lista de Estafas — Mayorista Brasil</title></Head>
      <SeccionContenido
        seccionId="estafas"
        titulo="Lista de Estafas"
        descripcion="Proveedores falsos, Instagram fake, estafas de PIX y de flete"
        icon={<FaShieldAlt />}
      />
    </DashboardLayout>
  );
}
