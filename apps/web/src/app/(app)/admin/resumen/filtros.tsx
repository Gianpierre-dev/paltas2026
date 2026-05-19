'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FieldRow } from '@/components/forms/field-row';

interface FundoOption {
  id: string;
  nombre: string;
}

interface FiltrosResumenProps {
  fecha: string;
  fundoId: string | null;
  fundos: FundoOption[];
}

export function FiltrosResumen({ fecha, fundoId, fundos }: FiltrosResumenProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fechaLocal, setFechaLocal] = useState(fecha);
  const [fundoLocal, setFundoLocal] = useState(fundoId ?? '');

  const aplicar = (nuevaFecha: string, nuevoFundo: string) => {
    const params = new URLSearchParams();
    if (nuevaFecha) params.set('fecha', nuevaFecha);
    if (nuevoFundo) params.set('fundoId', nuevoFundo);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/admin/resumen?${qs}` : '/admin/resumen');
      router.refresh();
    });
  };

  return (
    <div className="space-y-1">
      <FieldRow label="Fecha">
        <input
          type="date"
          value={fechaLocal}
          onChange={(e) => {
            const v = e.target.value;
            setFechaLocal(v);
            aplicar(v, fundoLocal);
          }}
          disabled={pending}
          className="w-full h-10 rounded-md border border-zinc-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
        />
      </FieldRow>

      <FieldRow label="Fundo">
        <select
          value={fundoLocal}
          onChange={(e) => {
            const v = e.target.value;
            setFundoLocal(v);
            aplicar(fechaLocal, v);
          }}
          disabled={pending}
          className="w-full h-10 rounded-md border border-zinc-300 px-3 text-sm bg-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
        >
          <option value="">Todos los fundos</option>
          {fundos.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
        </select>
      </FieldRow>
    </div>
  );
}
