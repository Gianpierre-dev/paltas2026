import { Injectable } from '@nestjs/common';
import { Prisma, ResultadoFinal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  DefectoTopItem,
  PorDiaItem,
  PorFundoItem,
  PorResultado,
  PorVariedadItem,
  StatsQuery,
  StatsResponse,
} from './stats.types';

function toISODate(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .substring(0, 10);
}

@Injectable()
export class InspeccionesStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(query: StatsQuery): Promise<StatsResponse> {
    // Normalizar al inicio del día UTC para comparar contra @db.Date
    const desde = new Date(
      Date.UTC(
        query.fechaDesde.getUTCFullYear(),
        query.fechaDesde.getUTCMonth(),
        query.fechaDesde.getUTCDate(),
      ),
    );
    const hasta = new Date(
      Date.UTC(
        query.fechaHasta.getUTCFullYear(),
        query.fechaHasta.getUTCMonth(),
        query.fechaHasta.getUTCDate(),
      ),
    );

    const whereInspeccion: Prisma.InspeccionWhereInput = {
      fecha: { gte: desde, lte: hasta },
    };

    const [
      totalInspecciones,
      groupResultado,
      groupFundo,
      groupVariedad,
      fundos,
      variedades,
      groupPorDia,
      groupDefectos,
      tiposDefecto,
    ] = await Promise.all([
      this.prisma.inspeccion.count({ where: whereInspeccion }),

      this.prisma.inspeccion.groupBy({
        by: ['resultadoFinal'],
        where: whereInspeccion,
        _count: { _all: true },
      }),

      this.prisma.inspeccion.groupBy({
        by: ['fundoId'],
        where: whereInspeccion,
        _count: { _all: true },
      }),

      this.prisma.inspeccion.groupBy({
        by: ['variedadId'],
        where: whereInspeccion,
        _count: { _all: true },
      }),

      this.prisma.fundo.findMany({
        select: { id: true, nombre: true },
      }),

      this.prisma.variedad.findMany({
        select: { id: true, nombre: true },
      }),

      this.prisma.inspeccion.groupBy({
        by: ['fecha'],
        where: whereInspeccion,
        _count: { _all: true },
        orderBy: { fecha: 'asc' },
      }),

      this.prisma.inspeccionDefecto.groupBy({
        by: ['tipoDefectoId'],
        where: { inspeccion: whereInspeccion },
        _count: { _all: true },
        _avg: { porcentajeCalculado: true },
      }),

      this.prisma.tipoDefecto.findMany({
        select: { id: true, nombre: true, familia: true },
      }),
    ]);

    // porResultado
    const porResultado: PorResultado = {
      BUENO: 0,
      ACEPTABLE: 0,
      RECHAZO: 0,
      SIN_RESULTADO: 0,
    };
    for (const row of groupResultado) {
      const count = row._count._all;
      if (row.resultadoFinal === null) {
        porResultado.SIN_RESULTADO += count;
      } else if (row.resultadoFinal === ResultadoFinal.BUENO) {
        porResultado.BUENO += count;
      } else if (row.resultadoFinal === ResultadoFinal.ACEPTABLE) {
        porResultado.ACEPTABLE += count;
      } else if (row.resultadoFinal === ResultadoFinal.RECHAZO) {
        porResultado.RECHAZO += count;
      }
    }

    // porFundo
    const fundoNombreById = new Map(fundos.map((f) => [f.id, f.nombre]));
    const porFundo: PorFundoItem[] = groupFundo
      .map((row) => ({
        fundoId: row.fundoId,
        fundoNombre: fundoNombreById.get(row.fundoId) ?? '(desconocido)',
        count: row._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    // porVariedad
    const variedadNombreById = new Map(variedades.map((v) => [v.id, v.nombre]));
    const porVariedad: PorVariedadItem[] = groupVariedad
      .map((row) => ({
        variedadId: row.variedadId,
        variedadNombre: variedadNombreById.get(row.variedadId) ?? '(desconocido)',
        count: row._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    // porDia
    const porDia: PorDiaItem[] = groupPorDia.map((row) => ({
      fecha: toISODate(row.fecha),
      count: row._count._all,
    }));

    // defectosTop — top 10 por totalInspecciones
    const tipoDefectoById = new Map(
      tiposDefecto.map((t) => [t.id, t]),
    );
    const defectosTop: DefectoTopItem[] = groupDefectos
      .map((row) => {
        const tipo = tipoDefectoById.get(row.tipoDefectoId);
        const avgDecimal = row._avg.porcentajeCalculado;
        const porcentajePromedio = avgDecimal
          ? Number(avgDecimal.toFixed(3))
          : 0;
        return {
          tipoDefectoId: row.tipoDefectoId,
          nombre: tipo?.nombre ?? '(desconocido)',
          familia: tipo?.familia ?? ('CALIDAD' as DefectoTopItem['familia']),
          totalInspecciones: row._count._all,
          porcentajePromedio,
        };
      })
      .sort((a, b) => b.totalInspecciones - a.totalInspecciones)
      .slice(0, 10);

    return {
      rangoFechas: {
        desde: toISODate(desde),
        hasta: toISODate(hasta),
      },
      totalInspecciones,
      porResultado,
      porFundo,
      porVariedad,
      defectosTop,
      porDia,
    };
  }
}
