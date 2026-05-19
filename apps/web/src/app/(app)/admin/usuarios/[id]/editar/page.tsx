import { notFound, redirect } from 'next/navigation';
import { Rol, type UsuarioAdmin } from '@paltas2026/shared';
import { ApiError, api } from '@/lib/api';
import { getServerSession } from '@/lib/session';
import { EditarUsuarioForm } from './_components/editar-usuario-form';

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  let usuario: UsuarioAdmin | null = null;
  try {
    usuario = await api<UsuarioAdmin>(`/usuarios/${id}`, {
      accessToken: session.accessToken,
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <div className="px-4 py-8 text-center text-sm text-red-600">
        No se pudo cargar el usuario.
      </div>
    );
  }
  if (!usuario) notFound();

  return (
    <div className="px-4 py-4 space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-zinc-900">Editar usuario</h2>
        <p className="text-sm text-zinc-500 mt-0.5">{usuario.email}</p>
      </header>
      <EditarUsuarioForm usuario={usuario} />
    </div>
  );
}
