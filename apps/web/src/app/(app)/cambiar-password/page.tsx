import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { CambiarPasswordForm } from './_components/cambiar-password-form';

export default async function CambiarPasswordPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return (
    <div className="px-4 py-4 space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-zinc-900">Cambiar password</h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Mínimo 8 caracteres. Distinta a la actual.
        </p>
      </header>
      <CambiarPasswordForm />
    </div>
  );
}
