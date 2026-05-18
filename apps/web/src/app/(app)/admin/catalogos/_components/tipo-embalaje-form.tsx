'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, api } from '@/lib/api';
import { getClientSession } from '@/lib/session-client';

const FormSchema = z.object({
  codigo: z.string().trim().min(1, 'Código requerido').max(20),
  descripcion: z.string().trim().min(1, 'Descripción requerida').max(100),
  pesoKg: z.coerce.number().positive('Peso debe ser > 0').max(9999.99),
  marca: z.string().trim().min(1, 'Marca requerida').max(50),
});
type FormValues = z.infer<typeof FormSchema>;

export interface TipoEmbalajeInitial {
  id: string;
  codigo: string;
  descripcion: string;
  pesoKg: string | number;
  marca: string;
}

interface Props {
  initialValues?: TipoEmbalajeInitial;
}

export function TipoEmbalajeForm({ initialValues }: Props) {
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
      codigo: initialValues?.codigo ?? '',
      descripcion: initialValues?.descripcion ?? '',
      // Backend devuelve Decimal como string a veces — normalizamos.
      pesoKg:
        initialValues?.pesoKg !== undefined
          ? Number(initialValues.pesoKg)
          : undefined,
      marca: initialValues?.marca ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const session = getClientSession();
    if (!session) {
      setServerError('Sesión expirada.');
      return;
    }

    const payload = {
      codigo: values.codigo,
      descripcion: values.descripcion,
      pesoKg: values.pesoKg,
      marca: values.marca,
    };

    try {
      if (isEdit) {
        await api(`/tipos-embalaje/${initialValues.id}`, {
          method: 'PATCH',
          body: payload,
          accessToken: session.accessToken,
        });
      } else {
        await api('/tipos-embalaje', {
          method: 'POST',
          body: payload,
          accessToken: session.accessToken,
        });
      }
      router.push('/admin/catalogos/tipos-embalaje');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setServerError(err.message);
      else setServerError('No se pudo guardar.');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field
        label="Código *"
        error={errors.codigo?.message}
        placeholder="Ej: 4KG-EXP"
      >
        <input
          {...register('codigo')}
          autoFocus
          className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base uppercase"
        />
      </Field>

      <Field label="Descripción *" error={errors.descripcion?.message}>
        <input
          {...register('descripcion')}
          className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
      </Field>

      <Field label="Peso (kg) *" error={errors.pesoKg?.message}>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          {...register('pesoKg')}
          className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
      </Field>

      <Field label="Marca *" error={errors.marca?.message}>
        <input
          {...register('marca')}
          className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
      </Field>

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
          href="/admin/catalogos/tipos-embalaje"
          className="h-12 px-4 inline-flex items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 font-medium hover:bg-zinc-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  placeholder: _placeholder,
  children,
}: {
  label: string;
  error?: string;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm text-zinc-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
