'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateUsuarioInputSchema,
  Rol,
  type CreateUsuarioInput,
  type CreateUsuarioResponse,
} from '@paltas2026/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, api } from '@/lib/api';
import { FieldRow } from '@/components/forms/field-row';

export function NuevoUsuarioForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateUsuarioResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUsuarioInput>({
    resolver: zodResolver(CreateUsuarioInputSchema),
    defaultValues: { rol: Rol.INSPECTOR },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const res = await api<CreateUsuarioResponse>('/usuarios', {
        method: 'POST',
        body: values,
      });
      setCreated(res);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'No se pudo crear el usuario.');
    }
  });

  if (created) {
    return <ShowOnceCard usuario={created} onClose={() => router.push('/admin/usuarios')} />;
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2" noValidate>
      <FieldRow label="Nombre *" error={errors.nombre?.message}>
        <input
          {...register('nombre')}
          autoFocus
          className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
      </FieldRow>

      <FieldRow label="Apellido *" error={errors.apellido?.message}>
        <input
          {...register('apellido')}
          className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
      </FieldRow>

      <FieldRow label="Email *" error={errors.email?.message}>
        <input
          type="email"
          autoComplete="off"
          autoCapitalize="none"
          {...register('email')}
          className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
      </FieldRow>

      <FieldRow label="Rol *" error={errors.rol?.message}>
        <select
          {...register('rol')}
          className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base bg-white"
        >
          <option value={Rol.INSPECTOR}>Inspector</option>
          <option value={Rol.ADMIN}>Administrador</option>
        </select>
      </FieldRow>

      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="flex items-center gap-3 pt-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-12 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 active:bg-brand-700 transition disabled:opacity-60"
        >
          {isSubmitting ? 'Creando...' : 'Crear usuario'}
        </button>
        <Link
          href="/admin/usuarios"
          className="h-12 px-4 inline-flex items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function ShowOnceCard({
  usuario,
  onClose,
}: {
  usuario: CreateUsuarioResponse;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    const text = `Usuario: ${usuario.email}\nPassword: ${usuario.temporaryPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-amber-900">
          ✓ Usuario creado — anotá las credenciales ahora
        </p>
        <p className="text-xs text-amber-800 mt-1">
          La password temporal NO se vuelve a poder ver. Pasásela al usuario por
          un canal seguro. La va a cambiar al iniciar sesión.
        </p>
      </div>

      <div className="bg-white border border-amber-200 rounded-lg p-3 font-mono text-sm space-y-1">
        <p>
          <span className="text-zinc-500">Email:</span>{' '}
          <span className="font-semibold text-zinc-900">{usuario.email}</span>
        </p>
        <p>
          <span className="text-zinc-500">Password:</span>{' '}
          <span className="font-semibold text-zinc-900 select-all">
            {usuario.temporaryPassword}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={copyAll}
          className="flex-1 h-11 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 active:bg-amber-800 transition"
        >
          {copied ? '¡Copiado!' : 'Copiar credenciales'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-11 px-4 inline-flex items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
