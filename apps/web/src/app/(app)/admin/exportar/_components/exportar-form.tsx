'use client';

import { useState } from 'react';
import { FieldRow } from '@/components/forms/field-row';

interface Option {
  id: string;
  nombre: string;
}

interface Props {
  fundos: Option[];
  clientes: Option[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfCurrentMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function ExportarForm({ fundos, clientes }: Props) {
  const [fechaDesde, setFechaDesde] = useState<string>(firstDayOfCurrentMonth());
  const [fechaHasta, setFechaHasta] = useState<string>(today());
  const [fundoId, setFundoId] = useState<string>('');
  const [clienteId, setClienteId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fechaDesde || !fechaHasta) {
      setError('Tenés que indicar el rango de fechas');
      return;
    }
    if (fechaDesde > fechaHasta) {
      setError('La fecha desde no puede ser posterior a la fecha hasta');
      return;
    }

    setGenerating(true);
    try {
      const params = new URLSearchParams({ fechaDesde, fechaHasta });
      if (fundoId) params.set('fundoId', fundoId);
      if (clienteId) params.set('clienteId', clienteId);

      // Vía Next proxy → backend devuelve el .xlsx como binario.
      const res = await fetch(`/api/proxy/inspecciones-export?${params}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(body || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paltas2026_inspecciones_${fechaDesde}_a_${fechaHasta}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo generar el reporte';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2"
      noValidate
    >
      <FieldRow label="Desde *">
        <input
          type="date"
          value={fechaDesde}
          max={fechaHasta || undefined}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
      </FieldRow>

      <FieldRow label="Hasta *">
        <input
          type="date"
          value={fechaHasta}
          min={fechaDesde || undefined}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        />
      </FieldRow>

      <FieldRow label="Fundo">
        <select
          value={fundoId}
          onChange={(e) => setFundoId(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base bg-white"
        >
          <option value="">Todos los fundos</option>
          {fundos.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
        </select>
      </FieldRow>

      <FieldRow label="Cliente">
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base bg-white"
        >
          <option value="">Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </FieldRow>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="pt-3">
        <button
          type="submit"
          disabled={generating}
          className="w-full h-12 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 active:bg-brand-700 transition disabled:opacity-60"
        >
          {generating ? 'Generando...' : 'Generar Excel'}
        </button>
      </div>

      <p className="text-xs text-zinc-500 pt-2">
        El reporte trae 4 hojas: Detalle (una fila por inspección), Por Fundo, Por Variedad
        y Por Cliente con totales y % de rechazo.
      </p>
    </form>
  );
}
