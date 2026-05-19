'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface Props {
  id: string;
  activo: boolean;
}

export function ToggleActivoUsuarioButton({ id, activo }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    const verbo = activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Querés ${verbo} este usuario?`)) return;

    setPending(true);
    try {
      await api(`/usuarios/${id}`, {
        method: 'PATCH',
        body: { activo: !activo },
      });
      router.refresh();
    } catch (err) {
      setPending(false);
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar.');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`text-xs font-medium px-3 py-1.5 rounded-md border transition disabled:opacity-60 ${
          activo
            ? 'border-red-300 text-red-700 hover:bg-red-50'
            : 'border-green-300 text-green-700 hover:bg-green-50'
        }`}
      >
        {pending ? '...' : activo ? 'Desactivar' : 'Activar'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </>
  );
}
