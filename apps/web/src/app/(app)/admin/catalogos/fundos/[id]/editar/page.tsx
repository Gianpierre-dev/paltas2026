import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Rol } from '@paltas2026/shared';
import { ApiError, api } from '@/lib/api';
import { getServerSession } from '@/lib/session';
import { CatalogoSimpleForm } from '../../../_components/catalogo-simple-form';

interface Fundo {
  id: string;
  nombre: string;
}

export default async function EditarFundoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  let item: Fundo | null = null;
  try {
    item = await api<Fundo>(`/fundos/${id}`, {
      accessToken: session.accessToken,
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <div className="px-4 py-8 text-center text-sm text-red-600">
        No se pudo cargar el fundo.
      </div>
    );
  }
  if (!item) notFound();

  return (
    <div className="px-4 py-4 space-y-4">
      <header>
        <Link
          href="/admin/catalogos/fundos"
          className="text-xs text-brand-600 hover:text-brand-700"
        >
          ← Fundos
        </Link>
        <h2 className="text-xl font-semibold text-zinc-900 mt-0.5">
          Editar fundo
        </h2>
      </header>

      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <CatalogoSimpleForm
          recurso="fundos"
          initialValues={{ id: item.id, nombre: item.nombre }}
        />
      </div>
    </div>
  );
}
