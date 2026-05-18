'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface Props {
  recurso: string;
  id: string;
  activo: boolean;
}

// PATCH { activo: !activo } — soft toggle. Para "eliminar" duro usamos DELETE.
// Como el back hace soft-delete, optamos por toggle explícito (más intuitivo
// para admin: pueden re-activar).
export function ToggleActivoButton({ recurso, id, activo }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setError(null);
    const verbo = activo ? 'desactivar' : 'activar';
    const ok = window.confirm(`¿Querés ${verbo} este item?`);
    if (!ok) return;

    setPending(true);
    try {
      if (activo) {
        // Desactivar usa DELETE (soft-delete en el backend).
        await api(`/${recurso}/${id}`, {
          method: 'DELETE',
        });
      } else {
        // Re-activar via PATCH activo:true.
        await api(`/${recurso}/${id}`, {
          method: 'PATCH',
          body: { activo: true },
        });
      }
      router.refresh();
    } catch (err) {
      setPending(false);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo actualizar.');
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className={`text-xs font-medium px-2 py-1 rounded-md transition disabled:opacity-60 ${
          activo
            ? 'text-red-700 hover:bg-red-50 border border-red-200'
            : 'text-green-700 hover:bg-green-50 border border-green-200'
        }`}
      >
        {pending ? '...' : activo ? 'Desactivar' : 'Activar'}
      </button>
      {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
    </>
  );
}
