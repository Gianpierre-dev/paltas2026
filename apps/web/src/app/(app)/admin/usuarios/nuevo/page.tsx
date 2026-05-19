import { redirect } from 'next/navigation';
import { Rol } from '@paltas2026/shared';
import { getServerSession } from '@/lib/session';
import { NuevoUsuarioForm } from './_components/nuevo-usuario-form';

export default async function NuevoUsuarioPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  return (
    <div className="px-4 py-4 space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-zinc-900">Nuevo usuario</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Se genera una password temporal que vas a ver UNA sola vez.
        </p>
      </header>
      <NuevoUsuarioForm />
    </div>
  );
}
