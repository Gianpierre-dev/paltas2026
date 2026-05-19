import { Suspense } from 'react';
import { headers } from 'next/headers';
import { LoginForm } from './login-form';

// Page como Server Component sin 'use client' — exporta dynamic=force-dynamic
// para evitar prerender estático + cache eterno del edge. Llamar a headers()
// también marca la page como dinámica explícitamente.
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Lectura cosmética que fuerza dynamic en runtime (cinturón + tiradores
  // por si la directiva exportada no alcanza en alguna versión de Next).
  await headers();
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
