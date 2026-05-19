'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoginInputSchema, type LoginInput, type UsuarioPublico } from '@paltas2026/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldRow } from '@/components/forms/field-row';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') ?? '/dashboard';
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await safeReadJson(res);
        if (res.status === 401) {
          setServerError('Email o contraseña incorrectos');
        } else if (res.status === 429) {
          setServerError('Demasiados intentos. Esperá un minuto.');
        } else {
          setServerError(typeof body?.message === 'string' ? body.message : 'No se pudo iniciar sesión');
        }
        return;
      }
      // El BFF setea las cookies httpOnly. Confirmamos sólo que el shape sea correcto.
      const usuario = (await res.json()) as UsuarioPublico;
      if (!usuario?.id) {
        setServerError('Respuesta de login inválida');
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setServerError('No se pudo conectar con el servidor');
    }
  });

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-brand-50 to-white">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-brand-500 flex items-center justify-center mb-4 shadow-lg shadow-brand-500/20">
            <span className="text-3xl">🥑</span>
          </div>
          <h1 className="text-2xl font-semibold text-brand-700">Paltas 2026</h1>
          <p className="text-sm text-zinc-600 mt-1">Control de calidad - Campaña 2026</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-2" noValidate>
          <FieldRow label="Email" required error={errors.email?.message}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition text-base"
              {...register('email')}
            />
          </FieldRow>

          <FieldRow label="Contraseña" required error={errors.password?.message}>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition text-base"
              {...register('password')}
            />
          </FieldRow>

          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 active:bg-brand-700 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-brand-500/20"
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  );
}

async function safeReadJson(res: Response): Promise<{ message?: unknown } | null> {
  try {
    return (await res.json()) as { message?: unknown };
  } catch {
    return null;
  }
}
