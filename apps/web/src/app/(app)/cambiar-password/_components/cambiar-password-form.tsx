'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChangePasswordInputSchema,
  type ChangePasswordInput,
} from '@paltas2026/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { FieldRow } from '@/components/forms/field-row';

// Extendemos el schema del shared con la confirmación de la nueva password.
const FormSchema = ChangePasswordInputSchema._def.schema
  .extend({
    confirmPassword: z.string().min(1, 'Confirmá la nueva password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las passwords no coinciden',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva password debe ser distinta a la actual',
    path: ['newPassword'],
  });

type FormValues = z.infer<typeof FormSchema>;

export function CambiarPasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      // Usamos fetch directo al proxy para que la cookie httpOnly viaje.
      // No usamos api() acá porque después de cambiar password, el backend
      // revoca todos los refresh tokens y el access actual queda inválido —
      // forzamos un re-login.
      const res = await fetch('/api/proxy/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        } satisfies ChangePasswordInput),
        cache: 'no-store',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          (body && typeof body === 'object' && 'message' in body
            ? String((body as { message: unknown }).message)
            : null) ?? `Error ${res.status}`;
        throw new ApiError(res.status, body, msg);
      }

      // Logout local: limpiamos cookies y volvemos al login. El usuario
      // entra con la nueva password.
      await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' }).catch(
        () => undefined,
      );
      router.push('/login?reason=password-changed');
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'No se pudo cambiar la password');
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2"
      noValidate
    >
      <FieldRow label="Password actual *" error={errors.currentPassword?.message}>
        <input
          type="password"
          autoComplete="current-password"
          {...register('currentPassword')}
          className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
      </FieldRow>

      <FieldRow label="Password nueva *" error={errors.newPassword?.message}>
        <input
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
          className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
      </FieldRow>

      <FieldRow label="Confirmar *" error={errors.confirmPassword?.message}>
        <input
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
      </FieldRow>

      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="pt-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 active:bg-brand-700 transition disabled:opacity-60"
        >
          {isSubmitting ? 'Cambiando...' : 'Cambiar password'}
        </button>
      </div>

      <p className="text-xs text-zinc-500 pt-2">
        Al cambiar la password se cerrarán todas tus sesiones activas. Vas a tener
        que iniciar sesión de nuevo.
      </p>
    </form>
  );
}
