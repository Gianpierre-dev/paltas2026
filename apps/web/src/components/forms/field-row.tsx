import type { ReactNode } from 'react';

interface FieldRowProps {
  /** Texto del label. Va uppercase, alineado a la derecha. */
  label: string;
  /** Si true, agrega asterisco al label. */
  required?: boolean;
  /** Mensaje de validación. Se renderiza debajo, alineado al control. */
  error?: string;
  /** El control (input, select, textarea, checkbox, etc). Toma flex-1. */
  children: ReactNode;
  /** Override del ancho del label (default w-[140px]). */
  labelWidthClass?: string;
}

// Patrón horizontal mobile-first:
//   LABEL  :  [control          ]
//             [error msg debajo]
//
// El label tiene ancho fijo para que la columna de los `:` quede alineada
// verticalmente entre filas. En pantallas <360px el label wrappea solo.
export function FieldRow({
  label,
  required,
  error,
  children,
  labelWidthClass = 'w-[120px]',
}: FieldRowProps) {
  return (
    <div className="py-1.5">
      <div className="flex items-start gap-2">
        <label
          className={`${labelWidthClass} shrink-0 text-right text-xs font-semibold uppercase tracking-tight text-zinc-700 pt-2.5 leading-tight`}
        >
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
        <span className="text-zinc-400 pt-2.5 text-sm shrink-0">:</span>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-0.5 pl-[136px]">{error}</p>
      )}
    </div>
  );
}
