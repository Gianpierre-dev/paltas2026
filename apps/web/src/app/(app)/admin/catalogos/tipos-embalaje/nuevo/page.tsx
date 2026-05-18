import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Rol } from '@paltas2026/shared';
import { getServerSession } from '@/lib/session';
import { TipoEmbalajeForm } from '../../_components/tipo-embalaje-form';

export default async function NuevoTipoEmbalajePage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  return (
    <div className="px-4 py-4 space-y-4">
      <header>
        <Link
          href="/admin/catalogos/tipos-embalaje"
          className="text-xs text-brand-600 hover:text-brand-700"
        >
          ← Tipos de embalaje
        </Link>
        <h2 className="text-xl font-semibold text-zinc-900 mt-0.5">
          Nuevo tipo de embalaje
        </h2>
      </header>

      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <TipoEmbalajeForm />
      </div>
    </div>
  );
}
