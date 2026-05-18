import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Rol } from '@paltas2026/shared';
import { ApiError, api } from '@/lib/api';
import { getServerSession } from '@/lib/session';
import {
  TipoDefectoForm,
  type TipoDefectoInitial,
} from '../../../_components/tipo-defecto-form';

export default async function EditarTipoDefectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  let item: TipoDefectoInitial | null = null;
  try {
    item = await api<TipoDefectoInitial>(`/tipos-defecto/${id}`, {
      accessToken: session.accessToken,
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <div className="px-4 py-8 text-center text-sm text-red-600">
        No se pudo cargar el tipo de defecto.
      </div>
    );
  }
  if (!item) notFound();

  return (
    <div className="px-4 py-4 space-y-4">
      <header>
        <Link
          href="/admin/catalogos/tipos-defecto"
          className="text-xs text-brand-600 hover:text-brand-700"
        >
          ← Tipos de defecto
        </Link>
        <h2 className="text-xl font-semibold text-zinc-900 mt-0.5">
          Editar tipo de defecto
        </h2>
      </header>

      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <TipoDefectoForm initialValues={item} />
      </div>
    </div>
  );
}
