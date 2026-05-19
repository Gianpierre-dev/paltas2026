'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FieldRow } from '@/components/forms/field-row';

interface FiltrosGraficosProps {
  fechaDesde: string;
  fechaHasta: string;
}

export function FiltrosGraficos({ fechaDesde, fechaHasta }: FiltrosGraficosProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [desdeLocal, setDesdeLocal] = useState(fechaDesde);
  const [hastaLocal, setHastaLocal] = useState(fechaHasta);

  const aplicar = (nuevaDesde: string, nuevaHasta: string) => {
    const params = new URLSearchParams();
    if (nuevaDesde) params.set('fechaDesde', nuevaDesde);
    if (nuevaHasta) params.set('fechaHasta', nuevaHasta);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/admin/graficos?${qs}` : '/admin/graficos');
      router.refresh();
    });
  };

  return (
    <div className="space-y-1">
      <FieldRow label="Desde">
        <input
          type="date"
          value={desdeLocal}
          max={hastaLocal || undefined}
          onChange={(e) => {
            const v = e.target.value;
            setDesdeLocal(v);
            aplicar(v, hastaLocal);
          }}
          disabled={pending}
          className="w-full h-10 rounded-md border border-zinc-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
        />
      </FieldRow>

      <FieldRow label="Hasta">
        <input
          type="date"
          value={hastaLocal}
          min={desdeLocal || undefined}
          onChange={(e) => {
            const v = e.target.value;
            setHastaLocal(v);
            aplicar(desdeLocal, v);
          }}
          disabled={pending}
          className="w-full h-10 rounded-md border border-zinc-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
        />
      </FieldRow>
    </div>
  );
}
