import Link from 'next/link';
import { ToggleActivoButton } from './toggle-activo-button';

export interface CatalogoRow {
  id: string;
  activo: boolean;
  // Celdas adicionales a renderizar (nombre, codigo, etc.)
  cells: React.ReactNode[];
}

interface Props {
  recurso: string;
  headers: string[];
  rows: CatalogoRow[];
  emptyMessage?: string;
}

// Tabla server-friendly: render listo del servidor, sólo los botones de
// activar/desactivar y eliminar son client (interactivos).
export function CatalogoTable({
  recurso,
  headers,
  rows,
  emptyMessage = 'Sin items.',
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="text-left font-medium text-zinc-700 px-3 py-2 border-b border-zinc-200 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
              <th className="text-left font-medium text-zinc-700 px-3 py-2 border-b border-zinc-200 w-1">
                Estado
              </th>
              <th className="text-right font-medium text-zinc-700 px-3 py-2 border-b border-zinc-200 w-1">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={row.activo ? 'bg-white' : 'bg-zinc-50/60 text-zinc-500'}
              >
                {row.cells.map((c, idx) => (
                  <td
                    key={idx}
                    className="px-3 py-2 border-b border-zinc-100 whitespace-nowrap"
                  >
                    {c}
                  </td>
                ))}
                <td className="px-3 py-2 border-b border-zinc-100">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      row.activo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {row.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-3 py-2 border-b border-zinc-100">
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                    <Link
                      href={`/admin/catalogos/${recurso}/${row.id}/editar`}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      Editar
                    </Link>
                    <ToggleActivoButton
                      recurso={recurso}
                      id={row.id}
                      activo={row.activo}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
