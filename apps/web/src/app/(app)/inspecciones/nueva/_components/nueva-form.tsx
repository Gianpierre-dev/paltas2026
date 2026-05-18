'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CALIBRES_ORDENADOS,
  Calibre,
  Categoria,
  EvaluacionFisica,
  FamiliaDefecto,
  TipoInspeccion,
} from '@paltas2026/shared';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, api } from '@/lib/api';
import type { CatalogosForForm } from '@/lib/catalogos';
import { getClientSession } from '@/lib/session-client';

// Schema del FORM — incluye cantidadPorDefecto como objeto (transformamos en submit).
// El schema oficial CreateInspeccionInputSchema espera defectos como array.
const FormSchema = z.object({
  tipo: z.enum([TipoInspeccion.EXPORTACION, TipoInspeccion.DESCARTE, TipoInspeccion.RECEPCION]),
  fecha: z.string().min(1, 'Fecha requerida'),
  numeroMuestra: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),

  fundoId: z.string().uuid('Seleccioná un fundo'),
  variedadId: z.string().uuid('Seleccioná una variedad'),
  tipoEmbalajeId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  clienteId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  destinoId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  categoria: z.enum([Categoria.CAT1, Categoria.CAT2]).optional().or(z.literal('').transform(() => undefined)),
  plu: z.boolean().optional(),
  calibre: z.enum([
    Calibre.C08, Calibre.C10, Calibre.C12, Calibre.C14, Calibre.C16,
    Calibre.C18, Calibre.C20, Calibre.C22, Calibre.C24, Calibre.C30,
  ]).optional().or(z.literal('').transform(() => undefined)),

  conteoMuestra: z.coerce.number().int().positive('Conteo debe ser mayor a 0'),

  calidadEmbalaje: z.enum([EvaluacionFisica.BUENO, EvaluacionFisica.ACEPTABLE, EvaluacionFisica.MALO]).optional().or(z.literal('').transform(() => undefined)),
  rotulacion: z.enum([EvaluacionFisica.BUENO, EvaluacionFisica.ACEPTABLE, EvaluacionFisica.MALO]).optional().or(z.literal('').transform(() => undefined)),
  paletizaje: z.enum([EvaluacionFisica.BUENO, EvaluacionFisica.ACEPTABLE, EvaluacionFisica.MALO]).optional().or(z.literal('').transform(() => undefined)),

  observaciones: z.string().max(2000).optional(),

  // { tipoDefectoId: cantidad }. Cero o vacío = no se envía.
  cantidadPorDefecto: z.record(z.string(), z.coerce.number().int().nonnegative().optional()),
});

type FormValues = z.infer<typeof FormSchema>;

const today = () => new Date().toISOString().substring(0, 10);

export function NuevaInspeccionForm({ catalogos }: { catalogos: CatalogosForForm }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const defectosCalidad = useMemo(
    () => catalogos.tiposDefecto.filter((d) => d.familia === FamiliaDefecto.CALIDAD),
    [catalogos.tiposDefecto],
  );
  const defectosCondicion = useMemo(
    () => catalogos.tiposDefecto.filter((d) => d.familia === FamiliaDefecto.CONDICION),
    [catalogos.tiposDefecto],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      tipo: TipoInspeccion.EXPORTACION,
      fecha: today(),
      cantidadPorDefecto: {},
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const session = getClientSession();
    if (!session) {
      setServerError('Sesión expirada. Volvé a iniciar sesión.');
      return;
    }

    // Transformamos el objeto cantidadPorDefecto a array, descartando ceros/undefined.
    const defectos = Object.entries(values.cantidadPorDefecto ?? {})
      .map(([tipoDefectoId, cantidad]) => ({
        tipoDefectoId,
        cantidadFrutos: Number(cantidad ?? 0),
      }))
      .filter((d) => d.cantidadFrutos > 0);

    const payload = {
      tipo: values.tipo,
      fecha: values.fecha,
      numeroMuestra: values.numeroMuestra,
      fundoId: values.fundoId,
      variedadId: values.variedadId,
      tipoEmbalajeId: values.tipoEmbalajeId,
      clienteId: values.clienteId,
      destinoId: values.destinoId,
      categoria: values.categoria,
      plu: values.plu,
      calibre: values.calibre,
      conteoMuestra: values.conteoMuestra,
      calidadEmbalaje: values.calidadEmbalaje,
      rotulacion: values.rotulacion,
      paletizaje: values.paletizaje,
      observaciones: values.observaciones,
      defectos,
    };

    try {
      const created = await api<{ id: string }>('/inspecciones', {
        method: 'POST',
        body: payload,
        accessToken: session.accessToken,
      });
      router.push(`/inspecciones/${created.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('No se pudo guardar la inspección');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="px-4 py-4 pb-32 space-y-4" noValidate>
      <h2 className="text-xl font-semibold text-zinc-900">Nueva inspección</h2>

      {/* SECCION 1: ENCABEZADO */}
      <Section title="1. Encabezado" defaultOpen>
        <FieldSelect
          label="Tipo de inspección *"
          {...register('tipo')}
          error={errors.tipo?.message}
          options={[
            { value: TipoInspeccion.EXPORTACION, label: 'Exportación' },
            { value: TipoInspeccion.DESCARTE, label: 'Descarte' },
            { value: TipoInspeccion.RECEPCION, label: 'Recepción' },
          ]}
        />

        <FieldInput
          label="Fecha *"
          type="date"
          {...register('fecha')}
          error={errors.fecha?.message}
        />

        <FieldInput
          label="N° Muestra"
          type="number"
          inputMode="numeric"
          {...register('numeroMuestra')}
          error={errors.numeroMuestra?.message}
        />

        <FieldSelect
          label="Fundo *"
          {...register('fundoId')}
          error={errors.fundoId?.message}
          options={[
            { value: '', label: 'Elegí un fundo...' },
            ...catalogos.fundos.map((f) => ({ value: f.id, label: f.nombre })),
          ]}
        />

        <FieldSelect
          label="Variedad *"
          {...register('variedadId')}
          error={errors.variedadId?.message}
          options={[
            { value: '', label: 'Elegí una variedad...' },
            ...catalogos.variedades.map((v) => ({ value: v.id, label: v.nombre })),
          ]}
        />

        <FieldSelect
          label="Embalaje"
          {...register('tipoEmbalajeId')}
          error={errors.tipoEmbalajeId?.message}
          options={[
            { value: '', label: '—' },
            ...catalogos.tiposEmbalaje.map((e) => ({
              value: e.id,
              label: `${e.codigo} — ${e.descripcion}`,
            })),
          ]}
        />

        <FieldSelect
          label="Cliente"
          {...register('clienteId')}
          error={errors.clienteId?.message}
          options={[
            { value: '', label: '—' },
            ...catalogos.clientes.map((c) => ({ value: c.id, label: c.nombre })),
          ]}
        />

        <FieldSelect
          label="Destino"
          {...register('destinoId')}
          error={errors.destinoId?.message}
          options={[
            { value: '', label: '—' },
            ...catalogos.destinos.map((d) => ({ value: d.id, label: d.nombre })),
          ]}
        />

        <FieldSelect
          label="Categoría"
          {...register('categoria')}
          error={errors.categoria?.message}
          options={[
            { value: '', label: '—' },
            { value: Categoria.CAT1, label: 'CAT 1' },
            { value: Categoria.CAT2, label: 'CAT 2' },
          ]}
        />

        <FieldCheckbox label="PLU" {...register('plu')} />

        <FieldTextarea
          label="Nota / Observaciones"
          {...register('observaciones')}
          error={errors.observaciones?.message}
        />
      </Section>

      {/* SECCION 2: EMBALAJE */}
      <Section title="2. Embalaje">
        <FieldInput
          label="Total frutos / Conteo *"
          type="number"
          inputMode="numeric"
          {...register('conteoMuestra')}
          error={errors.conteoMuestra?.message}
        />

        <FieldSelect
          label="Calibre"
          {...register('calibre')}
          error={errors.calibre?.message}
          options={[
            { value: '', label: '—' },
            ...CALIBRES_ORDENADOS.map((c) => ({
              value: c.codigo,
              label: String(c.valor),
            })),
          ]}
        />

        <FieldSelect
          label="Calidad embalaje"
          {...register('calidadEmbalaje')}
          error={errors.calidadEmbalaje?.message}
          options={evaluacionFisicaOptions}
        />
        <FieldSelect
          label="Rotulación"
          {...register('rotulacion')}
          error={errors.rotulacion?.message}
          options={evaluacionFisicaOptions}
        />
        <FieldSelect
          label="Paletizaje"
          {...register('paletizaje')}
          error={errors.paletizaje?.message}
          options={evaluacionFisicaOptions}
        />
      </Section>

      {/* SECCION 3: DEFECTOS */}
      <Section title="3. Defectos (cantidad de frutos)">
        <p className="text-xs text-zinc-500 mb-3">
          Ingresá la <strong>cantidad de frutos</strong> con cada defecto. El % se calcula
          automáticamente sobre el conteo total. Dejá vacío si no aplica.
        </p>

        <h4 className="text-sm font-medium text-zinc-700 mt-2 mb-1">
          Defectos de CALIDAD
        </h4>
        {defectosCalidad.map((d) => (
          <FieldInput
            key={d.id}
            label={d.nombre}
            type="number"
            inputMode="numeric"
            placeholder="0"
            {...register(`cantidadPorDefecto.${d.id}` as const)}
          />
        ))}

        <h4 className="text-sm font-medium text-zinc-700 mt-4 mb-1">
          Defectos de CONDICIÓN
        </h4>
        {defectosCondicion.map((d) => (
          <FieldInput
            key={d.id}
            label={d.nombre}
            type="number"
            inputMode="numeric"
            placeholder="0"
            {...register(`cantidadPorDefecto.${d.id}` as const)}
          />
        ))}
      </Section>

      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Submit bar fijo arriba del bottom nav */}
      <div className="fixed bottom-16 inset-x-0 px-4 py-3 bg-white border-t border-zinc-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 active:bg-brand-700 transition disabled:opacity-60"
        >
          {isSubmitting ? 'Guardando...' : 'Grabar inspección'}
        </button>
      </div>
    </form>
  );
}

const evaluacionFisicaOptions = [
  { value: '', label: '—' },
  { value: EvaluacionFisica.BUENO, label: 'BUENO' },
  { value: EvaluacionFisica.ACEPTABLE, label: 'ACEPTABLE' },
  { value: EvaluacionFisica.MALO, label: 'MALO' },
];

// ============================================================
// Sub-componentes
// ============================================================

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="bg-white border border-zinc-200 rounded-xl overflow-hidden group"
      open={defaultOpen}
    >
      <summary className="px-4 py-3 font-medium text-zinc-900 cursor-pointer select-none flex items-center justify-between hover:bg-zinc-50">
        <span>{title}</span>
        <span className="text-zinc-400 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="px-4 py-3 space-y-3 border-t border-zinc-100">{children}</div>
    </details>
  );
}

interface FieldBaseProps {
  label: string;
  error?: string;
}

const FieldInput = function FieldInput({
  label,
  error,
  ...rest
}: FieldBaseProps & React.InputHTMLAttributes<HTMLInputElement> & { name?: string }) {
  return (
    <div>
      <label className="block text-sm text-zinc-700 mb-1">{label}</label>
      <input
        className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

const FieldSelect = function FieldSelect({
  label,
  error,
  options,
  ...rest
}: FieldBaseProps & {
  options: { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement> & { name?: string }) {
  return (
    <div>
      <label className="block text-sm text-zinc-700 mb-1">{label}</label>
      <select
        className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base bg-white"
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

const FieldTextarea = function FieldTextarea({
  label,
  error,
  ...rest
}: FieldBaseProps &
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name?: string }) {
  return (
    <div>
      <label className="block text-sm text-zinc-700 mb-1">{label}</label>
      <textarea
        rows={2}
        className="w-full px-3 py-2 rounded-lg border border-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-base"
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

const FieldCheckbox = function FieldCheckbox({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement> & { name?: string }) {
  return (
    <label className="flex items-center gap-3 py-1">
      <input
        type="checkbox"
        className="h-5 w-5 rounded border-zinc-300 text-brand-500 focus:ring-brand-500/20"
        {...rest}
      />
      <span className="text-sm text-zinc-700">{label}</span>
    </label>
  );
};
