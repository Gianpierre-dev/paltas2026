import { Injectable } from '@nestjs/common';
import { TipoInspeccion } from '@prisma/client';
import type { ResumenDiarioQuery } from '@paltas2026/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InspeccionesResumenService {
  constructor(private readonly prisma: PrismaService) {}

  async getResumenDiario(query: ResumenDiarioQuery) {
    const { fecha, fundoId } = query;

    // La fecha llega como Date (z.coerce.date) — Prisma compara contra @db.Date.
    // Normalizamos al inicio del día UTC para que el match sea estable
    // independientemente de la zona horaria del cliente.
    const fechaDia = new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
    );

    const [inspecciones, tiposDefecto, fundo] = await Promise.all([
      this.prisma.inspeccion.findMany({
        where: {
          tipo: TipoInspeccion.EXPORTACION,
          fecha: fechaDia,
          ...(fundoId && { fundoId }),
        },
        orderBy: [
          { numeroMuestra: 'asc' },
          { createdAt: 'asc' },
        ],
        include: {
          variedad: true,
          cliente: true,
          destino: true,
          tipoEmbalaje: true,
          fundo: true,
          inspector: {
            select: { id: true, nombre: true, apellido: true, email: true },
          },
          defectos: {
            include: { tipoDefecto: true },
          },
        },
      }),
      this.prisma.tipoDefecto.findMany({
        where: { activo: true },
        orderBy: [{ familia: 'asc' }, { orden: 'asc' }, { nombre: 'asc' }],
      }),
      fundoId
        ? this.prisma.fundo.findUnique({
            where: { id: fundoId },
            select: { id: true, nombre: true },
          })
        : Promise.resolve(null),
    ]);

    return {
      fecha: fechaDia.toISOString().substring(0, 10),
      fundo: fundo ?? null,
      inspecciones,
      tiposDefecto,
    };
  }
}
