import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Rol, type UsuarioAdmin } from '@paltas2026/shared';
import { api } from '@/lib/api';
import { getServerSession } from '@/lib/session';
import { ToggleActivoUsuarioButton } from './_components/toggle-activo-usuario';

function fmt(fecha: string | null): string {
  if (!fecha) return '—';
  try {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return fecha.slice(0, 10);
  }
}

export default async function UsuariosPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  if (session.usuario.rol !== Rol.ADMIN) redirect('/dashboard');

  const usuarios = await api<UsuarioAdmin[]>('/usuarios', {
    accessToken: session.accessToken,
  }).catch(() => [] as UsuarioAdmin[]);

  return (
    <div className="px-4 py-4 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Usuarios</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Inspectores y administradores con acceso al sistema.
          </p>
        </div>
        <Link
          href="/admin/usuarios/nuevo"
          className="shrink-0 h-10 px-4 inline-flex items-center justify-center rounded-md bg-brand-500 text-white font-medium hover:bg-brand-600 active:bg-brand-700 transition text-sm"
        >
          + Nuevo
        </Link>
      </header>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        {usuarios.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">
            Sin usuarios cargados.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {usuarios.map((u) => (
              <li key={u.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-900 truncate">
                      {u.nombre} {u.apellido}
                    </p>
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        u.rol === Rol.ADMIN
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {u.rol}
                    </span>
                    {!u.activo && (
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700">
                        Inactivo
                      </span>
                    )}
                    {u.mustChangePassword && (
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                        Pendiente cambio
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{u.email}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Último login: {fmt(u.ultimoLogin)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/usuarios/${u.id}/editar`}
                    className="text-xs font-medium px-3 py-1.5 rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                  >
                    Editar
                  </Link>
                  <ToggleActivoUsuarioButton id={u.id} activo={u.activo} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
