'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, api } from '@/lib/api';
import { FieldRow } from '@/components/forms/field-row';

// Schema local del form — sirve para los 4 catálogos simples (sólo nombre).
// El backend valida con su propio schema; acá garantizamos UX inmediata.
const FormSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(50),
});
type FormValues = z.infer<typeof FormSchema>;

export type SimpleRecurso = 'variedades' | 'fundos' | 'clientes' | 'destinos';

interface Props {
  recurso: SimpleRecurso;
  initialValues?: { id: string; nombre: string };
}

export function CatalogoSimpleForm({ recurso, initialValues }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!initialValues;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { nombre: initialValues?.nombre ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (isEdit) {
        await api(`/${recurso}/${initialValues.id}`, {
          method: 'PATCH',
          body: { nombre: values.nombre },
        });
      } else {
        await api(`/${recurso}`, {
          method: 'POST',
          body: { nombre: values.nombre },
        });
      }
      router.push(`/admin/catalogos/${recurso}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('No se pudo guardar.');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-2" noValidate>
      <FieldRow label="Nombre" required error={errors.nombre?.message}>
        <input
          {...register('nombre')}
          autoFocus
          className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
      </FieldRow>

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
          href={`/admin/catalogos/${recurso}`}
          className="h-12 px-4 inline-flex items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 font-medium hover:bg-zinc-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
