import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Rol } from '@paltas2026/shared';
import { getServerSession } from '@/lib/session';
import { CatalogoSimpleForm } from '../../_components/catalogo-simple-form';

export default async function NuevoClientePage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  return (
    <div className="px-4 py-4 space-y-4">
      <header>
        <Link
          href="/admin/catalogos/clientes"
          className="text-xs text-brand-600 hover:text-brand-700"
        >
          ← Clientes
        </Link>
        <h2 className="text-xl font-semibold text-zinc-900 mt-0.5">
          Nuevo cliente
        </h2>
      </header>

      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <CatalogoSimpleForm recurso="clientes" />
      </div>
    </div>
  );
}
