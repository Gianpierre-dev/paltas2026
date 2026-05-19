import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import type { ExportInspeccionesQuery } from '@paltas2026/shared';
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
