'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Tipos locales — coinciden con el StatsResponse del backend.
// NO importar desde shared.

interface PorResultadoLocal {
  BUENO: number;
  ACEPTABLE: number;
  RECHAZO: number;
  SIN_RESULTADO: number;
}

interface PorFundoLocal {
  fundoId: string;
  fundoNombre: string;
  count: number;
}

interface DefectoTopLocal {
  tipoDefectoId: string;
  nombre: string;
  familia: 'CALIDAD' | 'CONDICION';
  totalInspecciones: number;
  porcentajePromedio: number;
}

interface PorDiaLocal {
  fecha: string;
  count: number;
}

interface StatsLocal {
  rangoFechas: { desde: string; hasta: string };
  totalInspecciones: number;
  porResultado: PorResultadoLocal;
  porFundo: PorFundoLocal[];
  porVariedad: Array<{ variedadId: string; variedadNombre: string; count: number }>;
  defectosTop: DefectoTopLocal[];
  porDia: PorDiaLocal[];
}

const COLOR_BUENO = '#16a34a';
const COLOR_ACEPTABLE = '#eab308';
const COLOR_RECHAZO = '#dc2626';
const COLOR_SIN_RESULTADO = '#a1a1aa';
const COLOR_CALIDAD = '#4d8b3a';
const COLOR_CONDICION = '#ea580c';
const COLOR_BRAND = '#4d8b3a';

function formatFechaCorta(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  } catch {
    return iso;
  }
}

interface ChartsClientProps {
  data: StatsLocal;
}

export function ChartsClient({ data }: ChartsClientProps) {
  const sinDataGlobal = data.totalInspecciones === 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ChartCard title="Distribución por resultado" subtitle={`Total: ${data.totalInspecciones} inspecciones`}>
        {sinDataGlobal ? (
          <EmptyState />
        ) : (
          <DonutResultado porResultado={data.porResultado} total={data.totalInspecciones} />
        )}
      </ChartCard>

      <ChartCard title="Inspecciones por fundo">
        {data.porFundo.length === 0 ? (
          <EmptyState />
        ) : (
          <BarsPorFundo porFundo={data.porFundo} />
        )}
      </ChartCard>

      <ChartCard title="Top 10 defectos más frecuentes" subtitle="Verde = calidad · Naranja = condición">
        {data.defectosTop.length === 0 ? (
          <EmptyState />
        ) : (
          <BarsDefectos defectos={data.defectosTop} />
        )}
      </ChartCard>

      <ChartCard title="Inspecciones por día">
        {data.porDia.length === 0 ? (
          <EmptyState />
        ) : (
          <AreaPorDia porDia={data.porDia} />
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col">
      <header className="mb-3">
        <h3 className="font-semibold text-zinc-900 text-sm">{title}</h3>
        {subtitle ? <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p> : null}
      </header>
      <div className="flex-1 min-h-[280px]">{children}</div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="h-full min-h-[280px] flex items-center justify-center text-sm text-zinc-400">
      Sin datos en el rango seleccionado
    </div>
  );
}

function DonutResultado({
  porResultado,
  total,
}: {
  porResultado: PorResultadoLocal;
  total: number;
}) {
  const chartData = [
    { name: 'Bueno', value: porResultado.BUENO, color: COLOR_BUENO },
    { name: 'Aceptable', value: porResultado.ACEPTABLE, color: COLOR_ACEPTABLE },
    { name: 'Rechazo', value: porResultado.RECHAZO, color: COLOR_RECHAZO },
    { name: 'Sin resultado', value: porResultado.SIN_RESULTADO, color: COLOR_SIN_RESULTADO },
  ].filter((d) => d.value > 0);

  return (
    <div className="relative h-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => {
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return [`${value} (${pct}%)`, name];
            }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center -mt-6">
          <div className="text-3xl font-semibold text-zinc-900">{total}</div>
          <div className="text-xs text-zinc-500">inspecciones</div>
        </div>
      </div>
    </div>
  );
}

function BarsPorFundo({ porFundo }: { porFundo: PorFundoLocal[] }) {
  const chartHeight = Math.max(280, porFundo.length * 36);
  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={porFundo}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
        >
          <XAxis type="number" allowDecimals={false} fontSize={11} />
          <YAxis
            type="category"
            dataKey="fundoNombre"
            width={120}
            fontSize={11}
            tick={{ fill: '#3f3f46' }}
          />
          <Tooltip cursor={{ fill: '#f4f4f5' }} />
          <Bar dataKey="count" fill={COLOR_BRAND} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BarsDefectos({ defectos }: { defectos: DefectoTopLocal[] }) {
  const chartHeight = Math.max(280, defectos.length * 32);
  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={defectos}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
        >
          <XAxis type="number" allowDecimals={false} fontSize={11} />
          <YAxis
            type="category"
            dataKey="nombre"
            width={140}
            fontSize={11}
            tick={{ fill: '#3f3f46' }}
          />
          <Tooltip
            cursor={{ fill: '#f4f4f5' }}
            formatter={(value: number, _name, props) => {
              const item = props?.payload as DefectoTopLocal | undefined;
              const pctProm = item ? item.porcentajePromedio.toFixed(2) : '0';
              return [`${value} inspecciones · ${pctProm}% prom.`, 'Apariciones'];
            }}
          />
          <Bar dataKey="totalInspecciones" radius={[0, 4, 4, 0]}>
            {defectos.map((d) => (
              <Cell
                key={d.tipoDefectoId}
                fill={d.familia === 'CALIDAD' ? COLOR_CALIDAD : COLOR_CONDICION}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AreaPorDia({ porDia }: { porDia: PorDiaLocal[] }) {
  const chartData = porDia.map((d) => ({ ...d, label: formatFechaCorta(d.fecha) }));
  return (
    <div className="h-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <defs>
            <linearGradient id="paltaArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLOR_BRAND} stopOpacity={0.5} />
              <stop offset="95%" stopColor={COLOR_BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" fontSize={11} tick={{ fill: '#3f3f46' }} />
          <YAxis allowDecimals={false} fontSize={11} tick={{ fill: '#3f3f46' }} />
          <Tooltip
            formatter={(value: number) => [`${value} inspecciones`, 'Total']}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload as { fecha?: string } | undefined;
              return item?.fecha ?? label;
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={COLOR_BRAND}
            fill="url(#paltaArea)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
