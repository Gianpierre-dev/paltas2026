import { BadRequestException, Injectable } from '@nestjs/common';
import { FamiliaDefecto, Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import type {
  ExportInspeccionesDiarioQuery,
  ExportInspeccionesQuery,
} from '@paltas2026/shared';
import { PrismaService } from '../prisma/prisma.service';

const MAX_RANGE_DAYS = 365;
const HEADER_FILL = 'FF166534'; // verde-800 paltas brand
const HEADER_FONT = 'FFFFFFFF';
const TOTAL_FILL = 'FFD1FAE5'; // verde-100

@Injectable()
export class InspeccionesExportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateWorkbook(
    query: ExportInspeccionesQuery,
  ): Promise<{ buffer: Buffer; filename: string }> {
    this.assertValidRange(query.fechaDesde, query.fechaHasta);

    const inspecciones = await this.fetchInspecciones(query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Paltas 2026';
    workbook.created = new Date();

    this.buildDetailSheet(workbook, query, inspecciones);
    this.buildAggregateSheet(workbook, 'Por Fundo', inspecciones, (i) => i.fundo?.nombre ?? '—');
    this.buildAggregateSheet(workbook, 'Por Variedad', inspecciones, (i) => i.variedad?.nombre ?? '—');
    this.buildAggregateSheet(workbook, 'Por Cliente', inspecciones, (i) => i.cliente?.nombre ?? 'Sin cliente');

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = this.buildFilename(query);
    return { buffer, filename };
  }

  private assertValidRange(desde: Date, hasta: Date): void {
    if (desde.getTime() > hasta.getTime()) {
      throw new BadRequestException('fechaDesde debe ser <= fechaHasta');
    }
    const diasMs = hasta.getTime() - desde.getTime();
    const dias = Math.ceil(diasMs / (1000 * 60 * 60 * 24)) + 1;
    if (dias > MAX_RANGE_DAYS) {
      throw new BadRequestException(`El rango no puede exceder ${MAX_RANGE_DAYS} días`);
    }
  }

  /**
   * Inspecciones de UN día específico con todos los includes que el reporte
   * diario necesita (variedad, embalaje con marca/peso, defectos con familia).
   */
  private async fetchInspeccionesDia(fecha: Date) {
    const desde = new Date(fecha);
    desde.setUTCHours(0, 0, 0, 0);
    const hasta = new Date(fecha);
    hasta.setUTCHours(23, 59, 59, 999);
    return this.prisma.inspeccion.findMany({
      where: { fecha: { gte: desde, lte: hasta }, deletedAt: null },
      orderBy: [{ fundoId: 'asc' }, { numeroMuestra: 'asc' }, { createdAt: 'asc' }],
      include: {
        fundo: { select: { id: true, nombre: true } },
        variedad: { select: { nombre: true } },
        cliente: { select: { nombre: true } },
        destino: { select: { nombre: true } },
        tipoEmbalaje: { select: { codigo: true, descripcion: true, marca: true, pesoKg: true } },
        inspector: { select: { nombre: true, apellido: true } },
        defectos: {
          include: { tipoDefecto: { select: { id: true, nombre: true, familia: true, orden: true } } },
        },
      },
    });
  }

  private async fetchInspecciones(query: ExportInspeccionesQuery) {
    const where: Prisma.InspeccionWhereInput = {
      fecha: { gte: query.fechaDesde, lte: query.fechaHasta },
      ...(query.fundoId && { fundoId: query.fundoId }),
      ...(query.clienteId && { clienteId: query.clienteId }),
      ...(query.incluirEliminadas ? {} : { deletedAt: null }),
    };
    return this.prisma.inspeccion.findMany({
      where,
      orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
      include: {
        fundo: { select: { nombre: true } },
        variedad: { select: { nombre: true } },
        cliente: { select: { nombre: true } },
        destino: { select: { nombre: true } },
        tipoEmbalaje: { select: { codigo: true, descripcion: true } },
        inspector: { select: { nombre: true, apellido: true } },
        defectos: {
          include: { tipoDefecto: { select: { nombre: true, familia: true } } },
        },
      },
    });
  }

  private buildDetailSheet(
    workbook: ExcelJS.Workbook,
    query: ExportInspeccionesQuery,
    inspecciones: Awaited<ReturnType<typeof this.fetchInspecciones>>,
  ): void {
    const sheet = workbook.addWorksheet('Detalle', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 13 },
      { header: 'N° Muestra', key: 'numeroMuestra', width: 11 },
      { header: 'Fundo', key: 'fundo', width: 18 },
      { header: 'Variedad', key: 'variedad', width: 14 },
      { header: 'Cliente', key: 'cliente', width: 22 },
      { header: 'Destino', key: 'destino', width: 14 },
      { header: 'Embalaje', key: 'embalaje', width: 14 },
      { header: 'Categoría', key: 'categoria', width: 10 },
      { header: 'PLU', key: 'plu', width: 6 },
      { header: 'Calibre', key: 'calibre', width: 8 },
      { header: 'Conteo', key: 'conteoMuestra', width: 8 },
      { header: 'Buenos', key: 'frutosBuenos', width: 8 },
      { header: 'Con defecto', key: 'conDefecto', width: 12 },
      { header: '% Calidad', key: 'pctCalidad', width: 10 },
      { header: '% Condición', key: 'pctCondicion', width: 11 },
      { header: 'Nota Calidad', key: 'notaCalidad', width: 12 },
      { header: 'Nota Condición', key: 'notaCondicion', width: 13 },
      { header: 'Nota Final', key: 'notaFinal', width: 11 },
      { header: 'Resultado', key: 'resultadoFinal', width: 12 },
      { header: 'Inspector', key: 'inspector', width: 22 },
    ];

    for (const i of inspecciones) {
      sheet.addRow({
        fecha: i.fecha,
        tipo: i.tipo,
        numeroMuestra: i.numeroMuestra,
        fundo: i.fundo?.nombre ?? '—',
        variedad: i.variedad?.nombre ?? '—',
        cliente: i.cliente?.nombre ?? '—',
        destino: i.destino?.nombre ?? '—',
        embalaje: i.tipoEmbalaje?.codigo ?? '—',
        categoria: i.categoria ?? '—',
        plu: i.plu === null ? '—' : i.plu ? 'SÍ' : 'NO',
        calibre: i.calibre?.replace('C', '') ?? '—',
        conteoMuestra: i.conteoMuestra,
        frutosBuenos: i.frutosBuenos,
        conDefecto:
          i.conteoMuestra != null && i.frutosBuenos != null
            ? i.conteoMuestra - i.frutosBuenos
            : null,
        pctCalidad: i.sumatoriaCalidad ? Number(i.sumatoriaCalidad) : null,
        pctCondicion: i.sumatoriaCondicion ? Number(i.sumatoriaCondicion) : null,
        notaCalidad: i.notaCalidad,
        notaCondicion: i.notaCondicion,
        notaFinal: i.notaFinal,
        resultadoFinal: i.resultadoFinal ?? '—',
        inspector: i.inspector
          ? `${i.inspector.nombre} ${i.inspector.apellido}`
          : '—',
      });
    }

    sheet.getColumn('fecha').numFmt = 'dd/mm/yyyy';
    sheet.getColumn('pctCalidad').numFmt = '0.00';
    sheet.getColumn('pctCondicion').numFmt = '0.00';

    sheet.autoFilter = { from: 'A1', to: { row: 1, column: sheet.columns.length } };
    this.styleHeader(sheet);
    this.colorearResultados(sheet, 'resultadoFinal');
    this.addTitle(sheet, query, inspecciones.length);
  }

  /**
   * Reporte diario ejecutivo: imita el formato del Excel "Reportes de Inspeccion
   * diaria" del cliente. Genera UNA hoja por fundo con inspecciones de
   * exportación ese día (pivot: columnas = muestras, filas = atributos +
   * defectos) más una hoja Descarte pivot por fundo si hay descartes.
   */
  async generateDailyReport(
    query: ExportInspeccionesDiarioQuery,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const [inspecciones, tiposDefecto] = await Promise.all([
      this.fetchInspeccionesDia(query.fecha),
      this.prisma.tipoDefecto.findMany({
        where: { activo: true },
        orderBy: [{ familia: 'asc' }, { orden: 'asc' }],
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Paltas 2026';
    workbook.created = new Date();

    // Agrupar exportaciones por fundo, separar descartes
    const exportPorFundo = new Map<string, typeof inspecciones>();
    const descartes: typeof inspecciones = [];

    for (const i of inspecciones) {
      if (i.tipo === 'EXPORTACION' && i.fundo) {
        const key = i.fundo.id;
        const arr = exportPorFundo.get(key) ?? [];
        arr.push(i);
        exportPorFundo.set(key, arr);
      } else if (i.tipo === 'DESCARTE') {
        descartes.push(i);
      }
    }

    for (const insps of exportPorFundo.values()) {
      const fundoNombre = insps[0]?.fundo?.nombre ?? 'Sin fundo';
      this.buildDailyPivotSheet(workbook, fundoNombre, insps, tiposDefecto, query.fecha);
    }

    if (descartes.length > 0) {
      this.buildDescartePivotSheet(workbook, descartes, tiposDefecto, query.fecha);
    }

    if (workbook.worksheets.length === 0) {
      const empty = workbook.addWorksheet('Sin datos');
      empty.getCell('A1').value = `Sin inspecciones para ${this.formatDate(query.fecha)}`;
      empty.getCell('A1').font = { italic: true, color: { argb: 'FF6B7280' } };
      empty.getColumn(1).width = 60;
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `paltas2026_reporte_diario_${this.formatDateIso(query.fecha)}.xlsx`;
    return { buffer, filename };
  }

  private buildDailyPivotSheet(
    workbook: ExcelJS.Workbook,
    fundoNombre: string,
    inspecciones: Awaited<ReturnType<typeof this.fetchInspeccionesDia>>,
    tiposDefecto: Array<{ id: string; nombre: string; familia: FamiliaDefecto; orden: number }>,
    fecha: Date,
  ): void {
    const sheetName = `Exportación ${fundoNombre}`.slice(0, 31);
    const sheet = workbook.addWorksheet(sheetName);

    const numMuestras = inspecciones.length;
    const lastCol = 1 + numMuestras;

    // Encabezado: PLANILLA + FUNDO + FECHA
    sheet.getCell(1, 1).value = 'PLANILLA DE INSPECCION PALTA PACKING';
    sheet.mergeCells(1, 1, 1, lastCol);
    sheet.getRow(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 24;

    sheet.getCell(2, 1).value = 'FUNDO';
    sheet.getCell(2, 1).font = { bold: true };
    sheet.getCell(2, 2).value = fundoNombre;
    sheet.getCell(3, 1).value = 'FECHA';
    sheet.getCell(3, 1).font = { bold: true };
    sheet.getCell(3, 2).value = this.formatDate(fecha);

    let row = 5;

    // Header de muestras
    const headerRow = sheet.getRow(row);
    headerRow.getCell(1).value = 'ATRIBUTO';
    inspecciones.forEach((insp, idx) => {
      headerRow.getCell(2 + idx).value = `M${insp.numeroMuestra ?? idx + 1}`;
    });
    headerRow.font = { bold: true, color: { argb: HEADER_FONT } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => this.applyThinBorder(cell));
    row++;

    const attrRow = (
      label: string,
      getter: (i: (typeof inspecciones)[number]) => string | number | null,
      opts: { bold?: boolean; bg?: string } = {},
    ) => {
      const r = sheet.getRow(row);
      r.getCell(1).value = label;
      r.getCell(1).font = { bold: true };
      inspecciones.forEach((insp, idx) => {
        const v = getter(insp);
        r.getCell(2 + idx).value = v === null ? '—' : v;
        r.getCell(2 + idx).alignment = { horizontal: 'center' };
      });
      if (opts.bold) r.font = { bold: true };
      if (opts.bg) {
        r.eachCell({ includeEmpty: false }, (cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg! } };
        });
      }
      r.eachCell({ includeEmpty: false }, (cell) => this.applyThinBorder(cell));
      row++;
    };

    attrRow('VARIEDAD', (i) => i.variedad?.nombre ?? '—');
    attrRow('EMBALAJE', (i) => i.tipoEmbalaje?.codigo ?? '—');
    attrRow('ETIQUETA', (i) =>
      i.tipoEmbalaje
        ? `${i.tipoEmbalaje.marca} - ${Number(i.tipoEmbalaje.pesoKg).toFixed(1)} kg`
        : '—',
    );
    attrRow('CLIENTE', (i) => i.cliente?.nombre ?? '—');
    attrRow('DESTINO', (i) => i.destino?.nombre ?? '—');
    attrRow('CATEGORIA', (i) => i.categoria ?? '—');
    attrRow('PLU', (i) => (i.plu === null ? '—' : i.plu ? 'SI' : 'NO'));
    attrRow('CALIBRE', (i) => i.calibre?.replace('C', '') ?? '—');
    attrRow('CONTEO', (i) => i.conteoMuestra ?? '—');
    attrRow('FRUTOS BUENOS', (i) => i.frutosBuenos ?? '—');
    attrRow('CON DEFECTO', (i) =>
      i.conteoMuestra != null && i.frutosBuenos != null
        ? i.conteoMuestra - i.frutosBuenos
        : '—',
    );
    attrRow('CALIDAD EMBALAJE', (i) => i.calidadEmbalaje ?? '—');
    attrRow('ROTULACION', (i) => i.rotulacion ?? '—');
    attrRow('PALETIZAJE', (i) => i.paletizaje ?? '—');

    // Separador + sección CALIDAD
    row++;
    sheet.getCell(row, 1).value = 'DEFECTOS DE CALIDAD';
    sheet.mergeCells(row, 1, row, lastCol);
    sheet.getRow(row).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(row).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    sheet.getRow(row).alignment = { horizontal: 'center' };
    row++;

    // Listar TODOS los defectos de calidad del catálogo, aunque en ninguna
    // muestra hayan aparecido. El cliente lee la planilla como checklist:
    // espera ver cada defecto con su valor (0 si no apareció).
    const tiposCalidad = tiposDefecto.filter((t) => t.familia === FamiliaDefecto.CALIDAD);
    for (const tipo of tiposCalidad) {
      attrRow(tipo.nombre.toUpperCase(), (i) => {
        const d = i.defectos.find((x) => x.tipoDefectoId === tipo.id);
        return d ? Number(d.porcentajeCalculado) : 0;
      });
    }
    attrRow(
      'Σ CALIDAD',
      (i) => (i.sumatoriaCalidad === null ? '' : Number(i.sumatoriaCalidad)),
      { bg: TOTAL_FILL },
    );
    attrRow('NOTA CALIDAD', (i) => i.notaCalidad ?? '—', { bg: TOTAL_FILL });

    // Sección CONDICIÓN
    row++;
    sheet.getCell(row, 1).value = 'DEFECTOS DE CONDICIÓN';
    sheet.mergeCells(row, 1, row, lastCol);
    sheet.getRow(row).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(row).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    sheet.getRow(row).alignment = { horizontal: 'center' };
    row++;

    // Misma lógica para CONDICIÓN: todos los del catálogo, 0 donde no apareció.
    const tiposCondicion = tiposDefecto.filter((t) => t.familia === FamiliaDefecto.CONDICION);
    for (const tipo of tiposCondicion) {
      attrRow(tipo.nombre.toUpperCase(), (i) => {
        const d = i.defectos.find((x) => x.tipoDefectoId === tipo.id);
        return d ? Number(d.porcentajeCalculado) : 0;
      });
    }
    attrRow(
      'Σ CONDICIÓN',
      (i) => (i.sumatoriaCondicion === null ? '' : Number(i.sumatoriaCondicion)),
      { bg: TOTAL_FILL },
    );
    attrRow('NOTA CONDICIÓN', (i) => i.notaCondicion ?? '—', { bg: TOTAL_FILL });

    // Resultado final
    row++;
    attrRow('NOTA FINAL', (i) => i.notaFinal ?? '—', { bg: 'FFFEF3C7' });
    // Resultado coloreado per-celda según el valor
    const resultadoRow = sheet.getRow(row);
    resultadoRow.getCell(1).value = 'RESULTADO';
    resultadoRow.getCell(1).font = { bold: true };
    inspecciones.forEach((insp, idx) => {
      const cell = resultadoRow.getCell(2 + idx);
      cell.value = insp.resultadoFinal ?? '—';
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      let bg: string | null = null;
      if (insp.resultadoFinal === 'BUENO') bg = 'FFD1FAE5';
      else if (insp.resultadoFinal === 'ACEPTABLE') bg = 'FFFEF3C7';
      else if (insp.resultadoFinal === 'RECHAZO') bg = 'FFFECACA';
      if (bg) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      }
      this.applyThinBorder(cell);
    });
    this.applyThinBorder(resultadoRow.getCell(1));

    // Anchos
    sheet.getColumn(1).width = 24;
    for (let i = 2; i <= lastCol; i++) {
      sheet.getColumn(i).width = 16;
    }
    sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 5 }];
  }

  /**
   * Hoja Descarte pivot: columnas = fundos del día, filas = FRUTA BUENA +
   * defectos. Replica el layout de la hoja "Descarte" del Excel del cliente.
   */
  private buildDescartePivotSheet(
    workbook: ExcelJS.Workbook,
    descartes: Awaited<ReturnType<typeof this.fetchInspeccionesDia>>,
    tiposDefecto: Array<{ id: string; nombre: string; familia: FamiliaDefecto; orden: number }>,
    fecha: Date,
  ): void {
    const sheet = workbook.addWorksheet('Descarte');

    // Agrupar descartes por fundo: cada fundo es una columna.
    // Si hay más de 1 descarte por fundo, promediamos los % por defecto.
    const porFundo = new Map<
      string,
      { nombre: string; inspecciones: typeof descartes }
    >();
    for (const d of descartes) {
      if (!d.fundo) continue;
      const key = d.fundo.id;
      const g = porFundo.get(key) ?? { nombre: d.fundo.nombre, inspecciones: [] };
      g.inspecciones.push(d);
      porFundo.set(key, g);
    }
    const fundos = Array.from(porFundo.values());
    if (fundos.length === 0) return;

    const numCols = 1 + fundos.length; // primera col = etiqueta de defecto

    // Encabezado
    sheet.getCell(1, 1).value = 'EVALUACIONES DE FRUTA DESCARTE';
    sheet.mergeCells(1, 1, 1, numCols);
    sheet.getRow(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 24;

    sheet.getCell(2, 1).value = 'FECHA';
    sheet.getCell(2, 1).font = { bold: true };
    sheet.getCell(2, 2).value = this.formatDate(fecha);

    let row = 4;

    // Header: DEFECTOS | <fundo1> | <fundo2> | ...
    const hdr = sheet.getRow(row);
    hdr.getCell(1).value = 'DEFECTOS';
    fundos.forEach((f, idx) => {
      hdr.getCell(2 + idx).value = f.nombre;
    });
    hdr.font = { bold: true, color: { argb: HEADER_FONT } };
    hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    hdr.alignment = { horizontal: 'center', vertical: 'middle' };
    hdr.eachCell((c) => this.applyThinBorder(c));
    row++;

    const sumarPctPorTipoEnFundo = (
      tipoId: string,
      grupoFundo: { inspecciones: typeof descartes },
    ): number | null => {
      let suma = 0;
      let count = 0;
      for (const insp of grupoFundo.inspecciones) {
        const d = insp.defectos.find((x) => x.tipoDefectoId === tipoId);
        if (d) {
          suma += Number(d.porcentajeCalculado);
          count++;
        }
      }
      // Si el defecto NO aparece en ninguna inspección de ese fundo → null
      if (count === 0) return null;
      return suma / grupoFundo.inspecciones.length;
    };

    const pctFrutaBuenaPorFundo = (grupoFundo: {
      inspecciones: typeof descartes;
    }): number => {
      const total = grupoFundo.inspecciones.reduce((acc, insp) => {
        const conteo = insp.conteoMuestra ?? 0;
        const buenos = insp.frutosBuenos ?? 0;
        return acc + (conteo > 0 ? (buenos * 100) / conteo : 0);
      }, 0);
      return grupoFundo.inspecciones.length > 0
        ? total / grupoFundo.inspecciones.length
        : 0;
    };

    // Fila FRUTA BUENA
    const fbRow = sheet.getRow(row);
    fbRow.getCell(1).value = 'FRUTA BUENA';
    fbRow.getCell(1).font = { bold: true };
    fundos.forEach((f, idx) => {
      fbRow.getCell(2 + idx).value = pctFrutaBuenaPorFundo(f);
      fbRow.getCell(2 + idx).numFmt = '0.0"%"';
      fbRow.getCell(2 + idx).alignment = { horizontal: 'center' };
    });
    fbRow.eachCell({ includeEmpty: false }, (c) => this.applyThinBorder(c));
    fbRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    fbRow.font = { bold: true };
    row++;

    // Fila CON DEFECTO = 100% - %FRUTA BUENA
    const cdRow = sheet.getRow(row);
    cdRow.getCell(1).value = 'CON DEFECTO';
    cdRow.getCell(1).font = { bold: true };
    fundos.forEach((f, idx) => {
      cdRow.getCell(2 + idx).value = 100 - pctFrutaBuenaPorFundo(f);
      cdRow.getCell(2 + idx).numFmt = '0.0"%"';
      cdRow.getCell(2 + idx).alignment = { horizontal: 'center' };
    });
    cdRow.eachCell({ includeEmpty: false }, (c) => this.applyThinBorder(c));
    cdRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
    cdRow.font = { bold: true };
    row++;

    // Sección CALIDAD
    sheet.getCell(row, 1).value = 'DEFECTOS DE CALIDAD';
    sheet.mergeCells(row, 1, row, numCols);
    sheet.getRow(row).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(row).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    sheet.getRow(row).alignment = { horizontal: 'center' };
    row++;

    // Listar TODOS los defectos de calidad del catálogo (checklist),
    // mostrando 0 en los fundos donde no apareció.
    for (const tipo of tiposDefecto.filter((t) => t.familia === FamiliaDefecto.CALIDAD)) {
      const valores = fundos.map((f) => sumarPctPorTipoEnFundo(tipo.id, f));
      const r = sheet.getRow(row);
      r.getCell(1).value = tipo.nombre.toUpperCase();
      r.getCell(1).font = { bold: true };
      valores.forEach((v, idx) => {
        r.getCell(2 + idx).value = v ?? 0;
        r.getCell(2 + idx).numFmt = '0.0"%"';
        r.getCell(2 + idx).alignment = { horizontal: 'center' };
      });
      r.eachCell({ includeEmpty: false }, (c) => this.applyThinBorder(c));
      row++;
    }

    // Sección CONDICIÓN
    sheet.getCell(row, 1).value = 'DEFECTOS DE CONDICIÓN';
    sheet.mergeCells(row, 1, row, numCols);
    sheet.getRow(row).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(row).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    sheet.getRow(row).alignment = { horizontal: 'center' };
    row++;

    // Misma lógica para CONDICIÓN.
    for (const tipo of tiposDefecto.filter((t) => t.familia === FamiliaDefecto.CONDICION)) {
      const valores = fundos.map((f) => sumarPctPorTipoEnFundo(tipo.id, f));
      const r = sheet.getRow(row);
      r.getCell(1).value = tipo.nombre.toUpperCase();
      r.getCell(1).font = { bold: true };
      valores.forEach((v, idx) => {
        r.getCell(2 + idx).value = v ?? 0;
        r.getCell(2 + idx).numFmt = '0.0"%"';
        r.getCell(2 + idx).alignment = { horizontal: 'center' };
      });
      r.eachCell({ includeEmpty: false }, (c) => this.applyThinBorder(c));
      row++;
    }

    // Anchos
    sheet.getColumn(1).width = 24;
    for (let i = 2; i <= numCols; i++) {
      sheet.getColumn(i).width = 14;
    }
  }

  private applyThinBorder(cell: ExcelJS.Cell): void {
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  private buildAggregateSheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    inspecciones: Awaited<ReturnType<typeof this.fetchInspecciones>>,
    groupBy: (i: Awaited<ReturnType<typeof this.fetchInspecciones>>[number]) => string,
  ): void {
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    });

    const grupos = new Map<
      string,
      {
        total: number;
        bueno: number;
        aceptable: number;
        rechazo: number;
        sumPctCalidad: number;
        sumPctCondicion: number;
        countConNota: number;
      }
    >();

    for (const i of inspecciones) {
      const key = groupBy(i);
      const g = grupos.get(key) ?? {
        total: 0,
        bueno: 0,
        aceptable: 0,
        rechazo: 0,
        sumPctCalidad: 0,
        sumPctCondicion: 0,
        countConNota: 0,
      };
      g.total += 1;
      if (i.resultadoFinal === 'BUENO') g.bueno += 1;
      else if (i.resultadoFinal === 'ACEPTABLE') g.aceptable += 1;
      else if (i.resultadoFinal === 'RECHAZO') g.rechazo += 1;
      if (i.sumatoriaCalidad !== null && i.sumatoriaCondicion !== null) {
        g.sumPctCalidad += Number(i.sumatoriaCalidad);
        g.sumPctCondicion += Number(i.sumatoriaCondicion);
        g.countConNota += 1;
      }
      grupos.set(key, g);
    }

    sheet.columns = [
      { header: sheetName.replace('Por ', ''), key: 'nombre', width: 24 },
      { header: 'Inspecciones', key: 'total', width: 13 },
      { header: 'BUENO', key: 'bueno', width: 9 },
      { header: 'ACEPTABLE', key: 'aceptable', width: 11 },
      { header: 'RECHAZO', key: 'rechazo', width: 10 },
      { header: '% Rechazo', key: 'pctRechazo', width: 10 },
      { header: 'Prom. % Calidad', key: 'promPctCalidad', width: 16 },
      { header: 'Prom. % Condición', key: 'promPctCondicion', width: 17 },
    ];

    // Sort: mayor cantidad de inspecciones primero
    const filas = Array.from(grupos.entries()).sort((a, b) => b[1].total - a[1].total);

    for (const [nombre, g] of filas) {
      sheet.addRow({
        nombre,
        total: g.total,
        bueno: g.bueno,
        aceptable: g.aceptable,
        rechazo: g.rechazo,
        pctRechazo: g.total > 0 ? (g.rechazo / g.total) * 100 : 0,
        promPctCalidad: g.countConNota > 0 ? g.sumPctCalidad / g.countConNota : 0,
        promPctCondicion: g.countConNota > 0 ? g.sumPctCondicion / g.countConNota : 0,
      });
    }

    // Totales
    const totales = filas.reduce(
      (acc, [, g]) => ({
        total: acc.total + g.total,
        bueno: acc.bueno + g.bueno,
        aceptable: acc.aceptable + g.aceptable,
        rechazo: acc.rechazo + g.rechazo,
        sumPctCalidad: acc.sumPctCalidad + g.sumPctCalidad,
        sumPctCondicion: acc.sumPctCondicion + g.sumPctCondicion,
        countConNota: acc.countConNota + g.countConNota,
      }),
      {
        total: 0,
        bueno: 0,
        aceptable: 0,
        rechazo: 0,
        sumPctCalidad: 0,
        sumPctCondicion: 0,
        countConNota: 0,
      },
    );

    const totalRow = sheet.addRow({
      nombre: 'TOTAL',
      total: totales.total,
      bueno: totales.bueno,
      aceptable: totales.aceptable,
      rechazo: totales.rechazo,
      pctRechazo: totales.total > 0 ? (totales.rechazo / totales.total) * 100 : 0,
      promPctCalidad: totales.countConNota > 0 ? totales.sumPctCalidad / totales.countConNota : 0,
      promPctCondicion: totales.countConNota > 0 ? totales.sumPctCondicion / totales.countConNota : 0,
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: TOTAL_FILL },
    };

    sheet.getColumn('pctRechazo').numFmt = '0.0"%"';
    sheet.getColumn('promPctCalidad').numFmt = '0.00';
    sheet.getColumn('promPctCondicion').numFmt = '0.00';

    this.styleHeader(sheet);
  }

  private styleHeader(sheet: ExcelJS.Worksheet): void {
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: HEADER_FONT } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_FILL },
    };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    header.height = 22;
    header.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  private colorearResultados(sheet: ExcelJS.Worksheet, columnKey: string): void {
    sheet.getColumn(columnKey).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber === 1) return;
      const value = cell.value;
      let bg: string | null = null;
      if (value === 'BUENO') bg = 'FFD1FAE5'; // verde-100
      else if (value === 'ACEPTABLE') bg = 'FFFEF3C7'; // amber-100
      else if (value === 'RECHAZO') bg = 'FFFECACA'; // red-200
      if (bg) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bg },
        };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
      }
    });
  }

  private addTitle(
    sheet: ExcelJS.Worksheet,
    query: ExportInspeccionesQuery,
    cantidad: number,
  ): void {
    // Inserta una fila ARRIBA del header con metadata (período + total).
    sheet.spliceRows(1, 0, []);
    const titleRow = sheet.getRow(1);
    titleRow.getCell(1).value = `Paltas 2026 — Inspecciones del ${this.formatDate(query.fechaDesde)} al ${this.formatDate(query.fechaHasta)} · ${cantidad} muestra${cantidad === 1 ? '' : 's'}`;
    titleRow.font = { italic: true, color: { argb: 'FF6B7280' }, size: 11 };
    titleRow.height = 18;
    // Mover el frozen pane una fila más abajo
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
  }

  private buildFilename(query: ExportInspeccionesQuery): string {
    const desde = this.formatDateIso(query.fechaDesde);
    const hasta = this.formatDateIso(query.fechaHasta);
    return `paltas2026_inspecciones_${desde}_a_${hasta}.xlsx`;
  }

  private formatDate(d: Date): string {
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getUTCFullYear()}`;
  }

  private formatDateIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
