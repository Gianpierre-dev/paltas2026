import { FamiliaDefecto, ReglaCalificacion, MatrizCalificacionFinal, ResultadoFinal } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Calcula el porcentaje de un defecto a partir de cantidad de frutos defectuosos
 * sobre el conteo total. PDF sección 4.0: porcentaje = frutos * 100 / conteo.
 */
export function calcularPorcentaje(cantidadFrutos: number, conteoTotal: number): number {
  if (conteoTotal <= 0) {
    throw new Error('conteoTotal debe ser > 0');
  }
  return (cantidadFrutos * 100) / conteoTotal;
}

/**
 * Dado un porcentaje y la familia (CALIDAD o CONDICION), devuelve la NOTA (1-4)
 * según las reglas cargadas en DB.
 *
 * Reglas:
 *  - porcentajeMin INCLUSIVE
 *  - porcentajeMax EXCLUSIVE
 *  - Si porcentajeMax es null, es el rango superior abierto (≥ min)
 *
 * Si ninguna regla matchea (no debería pasar con seed bien hecho), devuelve null.
 */
export function calcularNota(
  porcentaje: number,
  familia: FamiliaDefecto,
  reglas: ReglaCalificacion[],
): number | null {
  const reglasFamilia = reglas
    .filter((r) => r.familia === familia)
    .sort((a, b) => Number(a.porcentajeMin) - Number(b.porcentajeMin));

  for (const r of reglasFamilia) {
    const min = Number(r.porcentajeMin);
    const max = r.porcentajeMax !== null ? Number(r.porcentajeMax) : Infinity;
    if (porcentaje >= min && porcentaje < max) {
      return r.nota;
    }
  }
  return null;
}

/**
 * Dada notaCalidad y notaCondicion, devuelve { notaFinal, resultado } usando la matriz.
 * Si no hay match en la matriz, devuelve null.
 */
export function lookupMatriz(
  notaCalidad: number,
  notaCondicion: number,
  matriz: MatrizCalificacionFinal[],
): { notaFinal: number; resultado: ResultadoFinal } | null {
  const match = matriz.find(
    (m) => m.notaCalidad === notaCalidad && m.notaCondicion === notaCondicion,
  );
  if (!match) return null;
  return { notaFinal: match.notaFinal, resultado: match.resultado };
}

/**
 * Calcula sumatoria de porcentajes para una familia dada de defectos.
 * Recibe los defectos ya con sus porcentajes calculados.
 */
export function sumatoriaPorFamilia(
  defectos: { porcentajeCalculado: Decimal | number; tipoDefecto: { familia: FamiliaDefecto } }[],
  familia: FamiliaDefecto,
): number {
  return defectos
    .filter((d) => d.tipoDefecto.familia === familia)
    .reduce((acc, d) => acc + Number(d.porcentajeCalculado), 0);
}
