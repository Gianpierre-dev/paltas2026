'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Rol,
  UpdateUsuarioInputSchema,
  type ResetPasswordResponse,
  type UpdateUsuarioInput,
  type UsuarioAdmin,
} from '@paltas2026/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, api } from '@/lib/api';
import { FieldRow } from '@/components/forms/field-row';

interface Props {
  usuario: UsuarioAdmin;
}

export function EditarUsuarioForm({ usuario }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [reset, setReset] = useState<ResetPasswordResponse | null>(null);
  const [resetting, setResetting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUsuarioInput>({
    resolver: zodResolver(UpdateUsuarioInputSchema),
    defaultValues: {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
      activo: usuario.activo,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await api(`/usuarios/${usuario.id}`, { method: 'PATCH', body: values });
      router.push('/admin/usuarios');
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'No se pudo guardar.');
    }
  });

  const onReset = async () => {
    if (!window.confirm('¿Resetear la password? Se va a generar una nueva temporal.')) {
      return;
    }
    setResetting(true);
    setServerError(null);
    try {
      const res = await api<ResetPasswordResponse>(`/usuarios/${usuario.id}/reset-password`, {
        method: 'POST',
      });
      setReset(res);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'No se pudo resetear.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={onSubmit}
        className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2"
        noValidate
      >
        <FieldRow label="Nombre *" error={errors.nombre?.message}>
          <input
            {...register('nombre')}
            className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
          />
        </FieldRow>
        <FieldRow label="Apellido *" error={errors.apellido?.message}>
          <input
            {...register('apellido')}
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
        <FieldRow label="Activo">
          <input
            type="checkbox"
            {...register('activo')}
            className="h-5 w-5 rounded border-zinc-300 text-brand-500 focus:ring-brand-500/20 mt-2"
          />
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
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <Link
            href="/admin/usuarios"
            className="h-12 px-4 inline-flex items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </Link>
        </div>
      </form>

      <section className="bg-white border border-zinc-200 rounded-xl p-4">
        <header className="mb-2">
          <h3 className="font-medium text-zinc-900">Resetear password</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Genera una password temporal nueva. Forza al usuario a cambiarla al iniciar sesión.
          </p>
        </header>

        {reset ? (
          <ResetShownOnce reset={reset} email={usuario.email} onClose={() => setReset(null)} />
        ) : (
          <button
            type="button"
            onClick={onReset}
            disabled={resetting}
            className="w-full h-11 rounded-lg border border-red-300 text-red-700 font-medium hover:bg-red-50 active:bg-red-100 transition disabled:opacity-60"
          >
            {resetting ? 'Reseteando...' : 'Resetear password'}
          </button>
        )}
      </section>
    </div>
  );
}

function ResetShownOnce({
  reset,
  email,
  onClose,
}: {
  reset: ResetPasswordResponse;
  email: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Usuario: ${email}\nPassword: ${reset.temporaryPassword}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-2">
      <p className="text-sm font-semibold text-amber-900">
        ✓ Password reseteada — anotala ahora
      </p>
      <p className="text-xs text-amber-800">
        Pasásela al usuario por canal seguro. No se vuelve a poder ver.
      </p>
      <div className="bg-white border border-amber-200 rounded-md p-2 font-mono text-sm">
        <span className="text-zinc-500">Password:</span>{' '}
        <span className="font-semibold text-zinc-900 select-all">
          {reset.temporaryPassword}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex-1 h-10 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700 active:bg-amber-800 transition text-sm"
        >
          {copied ? '¡Copiado!' : 'Copiar credenciales'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-3 inline-flex items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-sm"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
