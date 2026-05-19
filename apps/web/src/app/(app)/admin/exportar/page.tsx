import { redirect } from 'next/navigation';
import { Rol } from '@paltas2026/shared';
import { api } from '@/lib/api';
import { getServerSession } from '@/lib/session';
import { ExportarForm } from './_components/exportar-form';

interface CatalogoSimple {
  id: string;
  nombre: string;
}

export default async function ExportarPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  const token = session.accessToken;
  const [fundos, clientes] = await Promise.all([
    api<CatalogoSimple[]>('/fundos', { accessToken: token }).catch(() => [] as CatalogoSimple[]),
    api<CatalogoSimple[]>('/clientes', { accessToken: token }).catch(() => [] as CatalogoSimple[]),
  ]);

  return (
    <div className="px-4 py-4 space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-zinc-900">Exportar reporte</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Generá un Excel ejecutivo con detalle y resúmenes por fundo, variedad y cliente.
        </p>
      </header>
      <ExportarForm fundos={fundos} clientes={clientes} />
    </div>
  );
}
