import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Rol } from '@paltas2026/shared';
import { ApiError, api } from '@/lib/api';
import { getServerSession } from '@/lib/session';
import {
  TipoEmbalajeForm,
  type TipoEmbalajeInitial,
} from '../../../_components/tipo-embalaje-form';

export default async function EditarTipoEmbalajePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  let item: TipoEmbalajeInitial | null = null;
  try {
    item = await api<TipoEmbalajeInitial>(`/tipos-embalaje/${id}`, {
      accessToken: session.accessToken,
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <div className="px-4 py-8 text-center text-sm text-red-600">
        No se pudo cargar el tipo de embalaje.
      </div>
    );
  }
  if (!item) notFound();

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
          Editar tipo de embalaje
        </h2>
      </header>

      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <TipoEmbalajeForm initialValues={item} />
      </div>
    </div>
  );
}
