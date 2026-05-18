'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface Props {
  inspeccionId: string;
}

export function AdminActions({ inspeccionId }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    // window.confirm es bloqueante — suficiente para esta UX simple.
    const ok = window.confirm(
      '¿Eliminar esta inspección? Esta acción no se puede deshacer.',
    );
    if (!ok) return;

    setDeleting(true);
    try {
      await api(`/inspecciones/${inspeccionId}`, {
        method: 'DELETE',
      });
      router.push('/inspecciones');
      router.refresh();
    } catch (err) {
      setDeleting(false);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo eliminar la inspección');
      }
    }
  }

  return (
    <section className="bg-white border border-zinc-200 rounded-xl">
      <header className="px-4 py-2.5 text-sm font-medium text-zinc-700 border-b border-zinc-100">
        Acciones de administrador
      </header>
      <div className="px-4 py-3 space-y-2">
        <Link
          href={`/inspecciones/${inspeccionId}/editar`}
          className="block w-full text-center py-3 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 active:bg-brand-700 transition"
        >
          Editar inspección
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="block w-full text-center py-3 rounded-lg border border-red-300 text-red-700 font-medium hover:bg-red-50 active:bg-red-100 transition disabled:opacity-60"
        >
          {deleting ? 'Eliminando...' : 'Eliminar inspección'}
        </button>
        {error && (
          <p className="text-xs text-red-600 pt-1">{error}</p>
        )}
      </div>
    </section>
  );
}
