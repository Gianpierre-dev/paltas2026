/**
 * Migración del histórico Excel `Inspecciones de proceso (33).xlsx` → DB Paltas2026.
 *
 * Uso:
 *   pnpm tsx scripts/migrate-historic.ts              # dry-run, NO inserta nada
 *   pnpm tsx scripts/migrate-historic.ts --apply      # ejecuta inserts en transacciones
 *   pnpm tsx scripts/migrate-historic.ts --limit 100  # solo primeras 100 filas
 *
 * Decisiones tomadas (ver reporte para detalle):
 *  1. La hoja `Descarte` se SALTA en esta primera versión (formato distinto y faltan
 *     campos requeridos por el modelo Inspeccion EXPORTACION). TODO migrar después.
 *  2. La columna del Excel rotulada `Fecha de Proceso` contiene en realidad el FUNDO
 *     (Hefei / Mosqueta / Pirona). Se mapea como tal. El header del Excel está mal puesto.
 *  3. Excel guarda PORCENTAJES, no cantidad de frutos. Para llenar `cantidadFrutos`
 *     hacemos conversión inversa: cantidadFrutos = round(porcentaje * conteo / 100).
 *     Esto introduce un pequeño error de redondeo (< 1 fruto). Aceptable para histórico.
 *  4. Columnas "Otros defectos de calidad / condición" del Excel NO se migran como
 *     defectos individuales (no hay TipoDefecto correspondiente en el catálogo). Se
 *     descartan con log informativo.
 *  5. Inspecciones se asignan a un inspector "dummy": `migrator@paltas2026.local`.
 *     Se crea en --apply si no existe.
 *  6. Las notas y resultado final se calculan acá usando las funciones puras de
 *     `src/inspecciones/calificacion.ts` + reglas y matriz del catálogo en DB.
 *  7. `numeroMuestra`, `calidadEmbalaje`, `rotulacion`, `paletizaje`: null (no existen
 *     en el Excel).
 */
import {
  Categoria,
  FamiliaDefecto,
  MatrizCalificacionFinal,
  PrismaClient,
  ReglaCalificacion,
  ResultadoFinal,
  Rol,
  TipoInspeccion,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as path from 'node:path';
import * as XLSX from 'xlsx';

import { calcularNota, lookupMatriz } from '../src/inspecciones/calificacion';

// ============================================================
// CONFIG
// ============================================================

const EXCEL_PATH = path.resolve(__dirname, '../../../requesitos/Inspecciones de proceso (33).xlsx');
const SHEET_EXPORTACION = 'Exportación';
const BATCH_SIZE = 100;

const INSPECTOR_DUMMY = {
  email: 'migrator@paltas2026.local',
  password: 'Migrator2026!Histor',
  nombre: 'Migración',
  apellido: 'Histórica',
};

const FUNDO_SIN_ESPECIFICAR = 'Sin especificar';

// ============================================================
// ARGS
// ============================================================

interface CliArgs {
  apply: boolean;
  limit: number | null;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { apply: false, limit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--limit') {
      const next = argv[i + 1];
      const n = Number(next);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`--limit espera un entero positivo, recibí: ${next}`);
      }
      args.limit = Math.floor(n);
      i++;
    }
  }
  return args;
}

// ============================================================
// TIPOS DEL EXCEL
// ============================================================

// Headers del Excel hoja Exportación. OJO: "Fecha de Proceso" contiene el FUNDO.
type ExcelRow = {
  Fecha: Date | string | number | null;
  'Fecha de Proceso': string | null; // ¡es el FUNDO!
  Variedad: string | null;
  'Código de Embalaje': string | null;
  Embalaje: string | null;
  Destino: string | null;
  PLU: string | null;
  Categoria: string | null;
  Cliente: string | null;
  Conteo: string | number | null;
  // Defectos CALIDAD
  Lenticelas: number | null;
  'Trips/Estrias': number | null;
  'Deformación': number | null;
  Cicatriz: number | null;
  Russet: number | null;
  'Pedúnculo Largo': number | null;
  Sombreado: number | null;
  'Sin pedunculo': number | null;
  'Golpe de sol': number | null;
  'Otros defectos de calidad': number | null;
  'Sumatoria de Calidad': number | null;
  // Defectos CONDICION
  'Daño mecánico': number | null;
  'Golpe/Machucón': number | null;
  'Sobremaduración / Blando': number | null;
  'Herida Abierta': number | null;
  Fumagina: number | null;
  Deshidratado: number | null;
  'Semilla Suelta': number | null;
  'Pudrición': number | null;
  Hongo: number | null;
  'Otros defectos de condición': number | null;
  'Suma de Condición': number | null;
};

// Mapeo header del Excel → nombre del TipoDefecto en el catálogo.
// Columnas que no tienen match (Otros defectos *) quedan fuera intencionalmente.
const COLUMN_TO_DEFECTO: Array<{ col: keyof ExcelRow; defectoNombre: string }> = [
  // CALIDAD
  { col: 'Lenticelas', defectoNombre: 'Lenticelas' },
  { col: 'Trips/Estrias', defectoNombre: 'Trips/Estrías' },
  { col: 'Deformación', defectoNombre: 'Deformación' },
  { col: 'Cicatriz', defectoNombre: 'Cicatriz' },
  { col: 'Russet', defectoNombre: 'Russet' },
  { col: 'Pedúnculo Largo', defectoNombre: 'Pedúnculo largo' },
  { col: 'Sombreado', defectoNombre: 'Sombreado' },
  { col: 'Sin pedunculo', defectoNombre: 'Sin pedúnculo' },
  { col: 'Golpe de sol', defectoNombre: 'Golpe de sol' },
  // CONDICION
  { col: 'Daño mecánico', defectoNombre: 'Daño mecánico' },
  { col: 'Golpe/Machucón', defectoNombre: 'Golpe/Machucón' },
  { col: 'Sobremaduración / Blando', defectoNombre: 'Sobremaduro/Blando' },
  { col: 'Herida Abierta', defectoNombre: 'Herida abierta' },
  { col: 'Fumagina', defectoNombre: 'Fumagina' },
  { col: 'Deshidratado', defectoNombre: 'Deshidratado' },
  { col: 'Semilla Suelta', defectoNombre: 'Pepa suelta' },
  { col: 'Pudrición', defectoNombre: 'Pudrición' },
  { col: 'Hongo', defectoNombre: 'Hongo' },
];

// Aliases para clientes del Excel que difieren del seed.
const CLIENTE_ALIAS: Record<string, string> = {
  'Bella Futa': 'Bella Fruta',
  'Hrnos. Fernandez': 'Hnos. Fernandez',
  // 'Sin Cliente' → no se mapea, queda null
};

// ============================================================
// HELPERS
// ============================================================

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita combining diacritics (acentos)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseConteo(raw: string | number | null): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : null;
  const m = String(raw).match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseFecha(raw: Date | string | number | null): Date | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) return Number.isFinite(raw.getTime()) ? raw : null;
  if (typeof raw === 'number') {
    // Fechas seriales de Excel — xlsx ya las convierte con cellDates: true, pero por las dudas.
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const d = new Date(String(raw));
  return Number.isFinite(d.getTime()) ? d : null;
}

function parseCategoria(raw: string | null): Categoria | null {
  if (!raw) return null;
  const n = normalize(raw);
  if (n === 'cat 1' || n === 'cat1') return Categoria.CAT1;
  if (n === 'cat 2' || n === 'cat2') return Categoria.CAT2;
  return null;
}

function parsePLU(raw: string | null): boolean | null {
  if (!raw) return null;
  const n = normalize(raw);
  if (n === 'si' || n === 'sí') return true;
  if (n === 'no') return false;
  return null;
}

function parseDateOnly(d: Date): Date {
  // Truncar a YYYY-MM-DD UTC para campo @db.Date
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function buildLookup<T extends { nombre: string }>(items: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const it of items) m.set(normalize(it.nombre), it);
  return m;
}

function buildLookupByCode<T extends { codigo: string }>(items: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const it of items) m.set(normalize(it.codigo), it);
  return m;
}

// ============================================================
// MAIN
// ============================================================

type FilaInvalida = {
  rowNum: number; // 1-based, fila Excel real (con header = fila 1)
  reason: string;
  detail?: string;
};

type FilaValida = {
  rowNum: number;
  fecha: Date;
  fundoId: string;
  variedadId: string;
  tipoEmbalajeId: string | null;
  clienteId: string | null;
  destinoId: string | null;
  categoria: Categoria | null;
  plu: boolean | null;
  conteoMuestra: number;
  sumatoriaCalidad: number;
  sumatoriaCondicion: number;
  notaCalidad: number;
  notaCondicion: number;
  notaFinal: number;
  resultadoFinal: ResultadoFinal;
  defectos: Array<{
    tipoDefectoId: string;
    cantidadFrutos: number;
    porcentajeCalculado: number;
  }>;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  console.log('================================================================');
  console.log(' Migración histórica — Inspecciones de proceso (33).xlsx');
  console.log('================================================================');
  console.log(` Modo:   ${args.apply ? 'APPLY (inserta en DB)' : 'DRY-RUN (no inserta)'}`);
  console.log(` Limit:  ${args.limit ?? '(sin límite)'}`);
  console.log(` Excel:  ${EXCEL_PATH}`);
  console.log('');

  // ----- Cargar catálogos
  const [variedades, fundos, destinos, clientes, embalajes, tiposDefecto, reglas, matriz] =
    await Promise.all([
      prisma.variedad.findMany(),
      prisma.fundo.findMany(),
      prisma.destino.findMany(),
      prisma.cliente.findMany(),
      prisma.tipoEmbalaje.findMany(),
      prisma.tipoDefecto.findMany(),
      prisma.reglaCalificacion.findMany(),
      prisma.matrizCalificacionFinal.findMany(),
    ]);

  const variedadByName = buildLookup(variedades);
  const fundoByName = buildLookup(fundos);
  const destinoByName = buildLookup(destinos);
  const clienteByName = buildLookup(clientes);
  const embalajeByCode = buildLookupByCode(embalajes);
  const defectoByName = buildLookup(tiposDefecto);

  // Validar que todos los defectos del mapping existan en catálogo
  for (const m of COLUMN_TO_DEFECTO) {
    if (!defectoByName.has(normalize(m.defectoNombre))) {
      console.error(
        `[FATAL] El catálogo no tiene TipoDefecto "${m.defectoNombre}" requerido por la columna "${m.col}". Corré el seed primero.`,
      );
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  // ----- Asegurar fundo "Sin especificar" (solo lookup en dry-run, upsert en apply)
  let fundoSinEspId: string | null = null;
  const fundoSinEspExistente = fundoByName.get(normalize(FUNDO_SIN_ESPECIFICAR));
  if (fundoSinEspExistente) {
    fundoSinEspId = fundoSinEspExistente.id;
  } else if (args.apply) {
    const created = await prisma.fundo.upsert({
      where: { nombre: FUNDO_SIN_ESPECIFICAR },
      update: {},
      create: { nombre: FUNDO_SIN_ESPECIFICAR },
    });
    fundoSinEspId = created.id;
    console.log(`[apply] Fundo "${FUNDO_SIN_ESPECIFICAR}" creado: ${fundoSinEspId}`);
  }
  // En dry-run, si no existe, no es bloqueante: solo lo necesitamos cuando una fila no
  // tiene fundo válido.

  // ----- Asegurar inspector dummy (solo en apply)
  let inspectorDummyId: string | null = null;
  if (args.apply) {
    const passHash = await bcrypt.hash(INSPECTOR_DUMMY.password, 10);
    const inspector = await prisma.usuario.upsert({
      where: { email: INSPECTOR_DUMMY.email },
      update: {},
      create: {
        email: INSPECTOR_DUMMY.email,
        passwordHash: passHash,
        nombre: INSPECTOR_DUMMY.nombre,
        apellido: INSPECTOR_DUMMY.apellido,
        rol: Rol.INSPECTOR,
      },
    });
    inspectorDummyId = inspector.id;
    console.log(`[apply] Inspector dummy: ${INSPECTOR_DUMMY.email} (${inspectorDummyId})`);
  } else {
    const existente = await prisma.usuario.findUnique({ where: { email: INSPECTOR_DUMMY.email } });
    inspectorDummyId = existente?.id ?? null;
  }

  // ----- Leer Excel
  console.log('\n[1/3] Leyendo Excel...');
  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  if (!wb.SheetNames.includes(SHEET_EXPORTACION)) {
    console.error(`[FATAL] El archivo no contiene la hoja "${SHEET_EXPORTACION}".`);
    await prisma.$disconnect();
    process.exit(1);
  }
  const ws = wb.Sheets[SHEET_EXPORTACION];
  const rowsRaw = XLSX.utils.sheet_to_json<ExcelRow>(ws, { defval: null });
  const totalLeidas = rowsRaw.length;
  const rows = args.limit ? rowsRaw.slice(0, args.limit) : rowsRaw;

  // NOTA: la hoja Descarte tiene formato distinto (otras columnas, no tiene Cliente/Destino/
  // Embalaje) — se omite. TODO en próxima iteración.
  const descarteRows = wb.SheetNames.includes('Descarte')
    ? (() => {
        const wsD = wb.Sheets['Descarte'];
        return XLSX.utils.sheet_to_json(wsD, { defval: null }).length;
      })()
    : 0;

  console.log(`  Hoja "${SHEET_EXPORTACION}": ${totalLeidas} filas (procesando ${rows.length})`);
  console.log(`  Hoja "Descarte": ${descarteRows} filas — SE SALTAN (TODO próxima versión)`);

  // ----- Validar y mapear
  console.log('\n[2/3] Validando y mapeando filas...');
  const validas: FilaValida[] = [];
  const invalidas: FilaInvalida[] = [];
  const reasonsCount = new Map<string, number>();
  const erroresEjemplo: Map<string, FilaInvalida[]> = new Map();
  let filasVaciasSkipped = 0;

  function isRowEmpty(row: ExcelRow): boolean {
    return !row.Fecha && !row['Fecha de Proceso'] && !row.Variedad && !row.Conteo;
  }

  function addInvalid(rowNum: number, reason: string, detail?: string) {
    invalidas.push({ rowNum, reason, detail });
    reasonsCount.set(reason, (reasonsCount.get(reason) ?? 0) + 1);
    const arr = erroresEjemplo.get(reason) ?? [];
    if (arr.length < 5) {
      arr.push({ rowNum, reason, detail });
      erroresEjemplo.set(reason, arr);
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2: fila 1 = header, filas se cuentan desde 1

    // Filas completamente vacías (padding al final del Excel) → skip silencioso
    if (isRowEmpty(row)) {
      filasVaciasSkipped++;
      continue;
    }

    // Fecha
    const fechaRaw = parseFecha(row.Fecha as Date | string | number | null);
    if (!fechaRaw) {
      addInvalid(rowNum, 'Fecha inválida', String(row.Fecha));
      continue;
    }
    const fecha = parseDateOnly(fechaRaw);

    // Conteo
    const conteo = parseConteo(row.Conteo);
    if (!conteo) {
      addInvalid(rowNum, 'Sin conteo válido', String(row.Conteo));
      continue;
    }

    // Variedad (requerido)
    const variedadName = row.Variedad?.trim() ?? '';
    if (!variedadName) {
      addInvalid(rowNum, 'Variedad ausente');
      continue;
    }
    const variedad = variedadByName.get(normalize(variedadName));
    if (!variedad) {
      addInvalid(rowNum, 'Variedad no encontrada', variedadName);
      continue;
    }

    // Fundo (la columna se llama "Fecha de Proceso" pero contiene el fundo)
    const fundoName = row['Fecha de Proceso']?.trim() ?? '';
    let fundoId: string | null = null;
    if (fundoName) {
      const fundo = fundoByName.get(normalize(fundoName));
      if (fundo) {
        fundoId = fundo.id;
      } else {
        addInvalid(rowNum, 'Fundo no encontrado', fundoName);
        continue;
      }
    } else {
      // No tiene fundo: usar "Sin especificar". En dry-run puede no existir aún.
      if (!fundoSinEspId) {
        addInvalid(
          rowNum,
          'Fundo ausente y "Sin especificar" no existe (correr --apply lo crea)',
          '',
        );
        continue;
      }
      fundoId = fundoSinEspId;
    }

    // Embalaje (opcional pero si viene debe matchear por código)
    let tipoEmbalajeId: string | null = null;
    const embCodigo = row['Código de Embalaje']?.trim();
    if (embCodigo) {
      const emb = embalajeByCode.get(normalize(embCodigo));
      if (emb) {
        tipoEmbalajeId = emb.id;
      } else {
        addInvalid(rowNum, 'Código de embalaje no encontrado', embCodigo);
        continue;
      }
    }

    // Destino (opcional)
    let destinoId: string | null = null;
    const destName = row.Destino?.trim();
    if (destName) {
      const dest = destinoByName.get(normalize(destName));
      if (dest) {
        destinoId = dest.id;
      } else {
        addInvalid(rowNum, 'Destino no encontrado', destName);
        continue;
      }
    }

    // Cliente (opcional). "Sin Cliente" → null. Hay alias para typos del Excel.
    let clienteId: string | null = null;
    const clienteRaw = row.Cliente?.trim();
    if (clienteRaw && normalize(clienteRaw) !== 'sin cliente') {
      const clienteName = CLIENTE_ALIAS[clienteRaw] ?? clienteRaw;
      const cli = clienteByName.get(normalize(clienteName));
      if (cli) {
        clienteId = cli.id;
      } else {
        addInvalid(rowNum, 'Cliente no encontrado', clienteRaw);
        continue;
      }
    }

    const categoria = parseCategoria(row.Categoria);
    const plu = parsePLU(row.PLU);

    // ----- Defectos: porcentaje → cantidadFrutos por conversión inversa
    const defectosInsp: FilaValida['defectos'] = [];
    for (const { col, defectoNombre } of COLUMN_TO_DEFECTO) {
      const raw = row[col] as number | null;
      if (raw === null || raw === undefined) continue;
      const pct = Number(raw);
      if (!Number.isFinite(pct) || pct <= 0) continue;
      const cantidadFrutos = Math.round((pct * conteo) / 100);
      if (cantidadFrutos <= 0) continue; // si el redondeo da 0, skip
      // recalcular porcentaje desde el cantidadFrutos redondeado para mantener invariante DB
      const porcentajeCalculado = (cantidadFrutos * 100) / conteo;
      const def = defectoByName.get(normalize(defectoNombre))!;
      defectosInsp.push({
        tipoDefectoId: def.id,
        cantidadFrutos,
        porcentajeCalculado,
      });
    }

    // ----- Calcular sumatorias y notas usando funciones puras
    const defectosConFamilia = defectosInsp.map((d) => {
      const tipoDef = tiposDefecto.find((t) => t.id === d.tipoDefectoId)!;
      return { ...d, familia: tipoDef.familia };
    });
    const sumatoriaCalidad = defectosConFamilia
      .filter((d) => d.familia === FamiliaDefecto.CALIDAD)
      .reduce((acc, d) => acc + d.porcentajeCalculado, 0);
    const sumatoriaCondicion = defectosConFamilia
      .filter((d) => d.familia === FamiliaDefecto.CONDICION)
      .reduce((acc, d) => acc + d.porcentajeCalculado, 0);

    const notaCalidad = calcularNota(sumatoriaCalidad, FamiliaDefecto.CALIDAD, reglas);
    const notaCondicion = calcularNota(sumatoriaCondicion, FamiliaDefecto.CONDICION, reglas);
    if (notaCalidad === null || notaCondicion === null) {
      addInvalid(
        rowNum,
        'Nota no calculable (regla faltante)',
        `cal=${sumatoriaCalidad} cond=${sumatoriaCondicion}`,
      );
      continue;
    }
    const matrizMatch = lookupMatriz(notaCalidad, notaCondicion, matriz);
    if (!matrizMatch) {
      addInvalid(
        rowNum,
        'Matriz sin entrada para (notaCal, notaCond)',
        `cal=${notaCalidad} cond=${notaCondicion}`,
      );
      continue;
    }

    validas.push({
      rowNum,
      fecha,
      fundoId,
      variedadId: variedad.id,
      tipoEmbalajeId,
      clienteId,
      destinoId,
      categoria,
      plu,
      conteoMuestra: conteo,
      sumatoriaCalidad,
      sumatoriaCondicion,
      notaCalidad,
      notaCondicion,
      notaFinal: matrizMatch.notaFinal,
      resultadoFinal: matrizMatch.resultado,
      defectos: defectosInsp,
    });
  }

  // ----- Reporte
  console.log('\n[3/3] Reporte de validación');
  console.log('  -----------------------------------------------------------------');
  console.log(`  Total filas leídas:    ${rows.length}${args.limit ? ` (limit ${args.limit})` : ''}`);
  console.log(`  Filas vacías (skip):   ${filasVaciasSkipped}`);
  console.log(`  Filas válidas:         ${validas.length}`);
  console.log(`  Filas con problemas:   ${invalidas.length}`);
  if (reasonsCount.size > 0) {
    console.log('  Desglose:');
    const sortedReasons = [...reasonsCount.entries()].sort((a, b) => b[1] - a[1]);
    for (const [reason, count] of sortedReasons) {
      console.log(`    - ${reason}: ${count}`);
    }
    console.log('\n  Primeros 5 errores por categoría:');
    for (const [reason, ejemplos] of erroresEjemplo) {
      console.log(`    [${reason}]`);
      for (const e of ejemplos) {
        console.log(`      fila ${e.rowNum}: ${e.detail ?? '(sin detalle)'}`);
      }
    }
  }

  // ----- APPLY
  if (!args.apply) {
    console.log('\n[dry-run] No se insertó nada en la DB. Usá --apply para ejecutar.');
    await prisma.$disconnect();
    return;
  }

  if (!inspectorDummyId) {
    console.error('[FATAL] Sin inspector dummy en modo --apply (no debería pasar).');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`\n[apply] Insertando ${validas.length} inspecciones en lotes de ${BATCH_SIZE}...`);
  let inserted = 0;
  let txErrors = 0;
  const erroresInsert: Array<{ rowNum: number; error: string }> = [];

  for (let i = 0; i < validas.length; i += BATCH_SIZE) {
    const batch = validas.slice(i, i + BATCH_SIZE);
    try {
      await prisma.$transaction(async (tx) => {
        for (const v of batch) {
          await tx.inspeccion.create({
            data: {
              tipo: TipoInspeccion.EXPORTACION,
              fecha: v.fecha,
              numeroMuestra: null,
              inspectorId: inspectorDummyId!,
              fundoId: v.fundoId,
              variedadId: v.variedadId,
              tipoEmbalajeId: v.tipoEmbalajeId,
              clienteId: v.clienteId,
              destinoId: v.destinoId,
              categoria: v.categoria,
              plu: v.plu,
              calibre: null,
              conteoMuestra: v.conteoMuestra,
              calidadEmbalaje: null,
              rotulacion: null,
              paletizaje: null,
              sumatoriaCalidad: new Prisma.Decimal(v.sumatoriaCalidad.toFixed(3)),
              sumatoriaCondicion: new Prisma.Decimal(v.sumatoriaCondicion.toFixed(3)),
              notaCalidad: v.notaCalidad,
              notaCondicion: v.notaCondicion,
              notaFinal: v.notaFinal,
              resultadoFinal: v.resultadoFinal,
              defectos: {
                create: v.defectos.map((d) => ({
                  tipoDefectoId: d.tipoDefectoId,
                  cantidadFrutos: d.cantidadFrutos,
                  porcentajeCalculado: new Prisma.Decimal(d.porcentajeCalculado.toFixed(3)),
                })),
              },
            },
          });
        }
      });
      inserted += batch.length;
      if ((i / BATCH_SIZE) % 10 === 0 || i + BATCH_SIZE >= validas.length) {
        console.log(`  ... ${inserted}/${validas.length}`);
      }
    } catch (e) {
      txErrors += batch.length;
      const msg = e instanceof Error ? e.message : String(e);
      for (const v of batch) erroresInsert.push({ rowNum: v.rowNum, error: msg });
      console.error(`  [batch ${i}-${i + batch.length}] ERROR: ${msg}`);
    }
  }

  console.log('\n================================================================');
  console.log(' Resumen final');
  console.log('================================================================');
  console.log(`  Insertadas:           ${inserted}`);
  console.log(`  Errores en inserción: ${txErrors}`);
  if (erroresInsert.length > 0) {
    console.log('  Primeros 5 errores:');
    for (const e of erroresInsert.slice(0, 5)) {
      console.log(`    fila ${e.rowNum}: ${e.error}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('[migrate-historic] ERROR FATAL:', e);
  process.exit(1);
});
