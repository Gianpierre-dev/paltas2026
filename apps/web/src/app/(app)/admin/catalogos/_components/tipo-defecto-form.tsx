'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FamiliaDefecto } from '@paltas2026/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, api } from '@/lib/api';
import { getClientSession } from '@/lib/session-client';

const FormSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(80),
  familia: z.enum([FamiliaDefecto.CALIDAD, FamiliaDefecto.CONDICION]),
  orden: z.coerce.number().int().nonnegative('Orden debe ser >= 0'),
});
type FormValues = z.infer<typeof FormSchema>;

export interface TipoDefectoInitial {
  id: string;
  nombre: string;
  familia: FamiliaDefecto;
  orden: number;
}

interface Props {
  initialValues?: TipoDefectoInitial;
}

export function TipoDefectoForm({ initialValues }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!initialValues;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      nombre: initialValues?.nombre ?? '',
      familia: initialValues?.familia ?? FamiliaDefecto.CALIDAD,
      orden: initialValues?.orden ?? 0,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const session = getClientSession();
    if (!session) {
      setServerError('Sesión expirada.');
      return;
    }

    try {
      if (isEdit) {
        await api(`/tipos-defecto/${initialValues.id}`, {
          method: 'PATCH',
          body: values,
          accessToken: session.accessToken,
        });
      } else {
        await api('/tipos-defecto', {
          method: 'POST',
          body: values,
          accessToken: session.accessToken,
        });
      }
      router.push('/admin/catalogos/tipos-defecto');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setServerError(err.message);
      else setServerError('No se pudo guardar.');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm text-zinc-700 mb-1">Nombre *</label>
        <input
          {...register('nombre')}
          autoFocus
          className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
        {errors.nombre && (
          <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-zinc-700 mb-1">Familia *</label>
        <select
          {...register('familia')}
          className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base bg-white"
        >
          <option value={FamiliaDefecto.CALIDAD}>CALIDAD</option>
          <option value={FamiliaDefecto.CONDICION}>CONDICIÓN</option>
        </select>
        {errors.familia && (
          <p className="mt-1 text-xs text-red-600">{errors.familia.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-zinc-700 mb-1">
          Orden (de menor a mayor en la planilla)
        </label>
        <input
          type="number"
          inputMode="numeric"
          {...register('orden')}
          className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
        {errors.orden && (
          <p className="mt-1 text-xs text-red-600">{errors.orden.message}</p>
        )}
      </div>

      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-12 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 active:bg-brand-700 transition disabled:opacity-60"
        >
          {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear'}
        </button>
        <Link
          href="/admin/catalogos/tipos-defecto"
          className="h-12 px-4 inline-flex items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 font-medium hover:bg-zinc-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
