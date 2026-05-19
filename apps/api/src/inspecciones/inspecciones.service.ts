import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FamiliaDefecto, Prisma, ResultadoFinal, Rol } from '@prisma/client';
import type {
  CreateInspeccionInput,
  JwtPayload,
  ListInspeccionesQuery,
  UpdateInspeccionInput,
} from '@paltas2026/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  calcularNota,
  calcularPorcentaje,
  lookupMatriz,
  sumatoriaPorFamilia,
} from './calificacion';

@Injectable()
export class InspeccionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(inspectorId: string, input: CreateInspeccionInput) {
    // 1) Validar referencias de FK existen
    await this.validateReferences(input);

    // 2) Validar que NO haya defectos duplicados (mismo tipoDefectoId 2 veces)
    const tipoDefectoIds = input.defectos.map((d) => d.tipoDefectoId);
    if (new Set(tipoDefectoIds).size !== tipoDefectoIds.length) {
      throw new BadRequestException('No se puede cargar el mismo tipo de defecto dos veces');
    }

    // 3) Validar que cada cantidadFrutos <= conteoMuestra
    for (const d of input.defectos) {
      if (d.cantidadFrutos > input.conteoMuestra) {
        throw new BadRequestException(
          `cantidadFrutos (${d.cantidadFrutos}) supera el conteo total (${input.conteoMuestra})`,
        );
      }
    }

    // 4) Cargar tipos de defecto referenciados + reglas + matriz en una sola query c/u
    const [tiposDefecto, reglas, matriz] = await Promise.all([
      this.prisma.tipoDefecto.findMany({
        where: { id: { in: tipoDefectoIds }, activo: true },
      }),
      this.prisma.reglaCalificacion.findMany(),
      this.prisma.matrizCalificacionFinal.findMany(),
    ]);

    if (tiposDefecto.length !== tipoDefectoIds.length) {
      const encontrados = new Set(tiposDefecto.map((t) => t.id));
      const faltantes = tipoDefectoIds.filter((id) => !encontrados.has(id));
      throw new BadRequestException(
        `Tipos de defecto no encontrados o inactivos: ${faltantes.join(', ')}`,
      );
    }
    const tipoDefectoById = new Map(tiposDefecto.map((t) => [t.id, t]));

    // 5) Calcular porcentaje por defecto + asignar familia
    const defectosConPorcentaje = input.defectos.map((d) => {
      const tipo = tipoDefectoById.get(d.tipoDefectoId)!;
      const porcentaje = calcularPorcentaje(d.cantidadFrutos, input.conteoMuestra);
      return {
        tipoDefectoId: d.tipoDefectoId,
        cantidadFrutos: d.cantidadFrutos,
        porcentajeCalculado: new Prisma.Decimal(porcentaje.toFixed(3)),
        tipoDefecto: { familia: tipo.familia },
      };
    });

    // 6) Sumatorias por familia
    const sumatoriaCalidad = sumatoriaPorFamilia(defectosConPorcentaje, FamiliaDefecto.CALIDAD);
    const sumatoriaCondicion = sumatoriaPorFamilia(defectosConPorcentaje, FamiliaDefecto.CONDICION);

    // 7) Nota por familia
    const notaCalidad = calcularNota(sumatoriaCalidad, FamiliaDefecto.CALIDAD, reglas);
    const notaCondicion = calcularNota(sumatoriaCondicion, FamiliaDefecto.CONDICION, reglas);

    if (notaCalidad === null || notaCondicion === null) {
      throw new BadRequestException(
        `No se pudo calcular nota: sumCalidad=${sumatoriaCalidad} sumCondicion=${sumatoriaCondicion}. ` +
          `Revisar tabla de reglas_calificacion.`,
      );
    }

    // 8) Resultado final por matriz
    const finalLookup = lookupMatriz(notaCalidad, notaCondicion, matriz);
    if (!finalLookup) {
      throw new BadRequestException(
        `No hay entrada en matriz_calificacion_final para (${notaCalidad}, ${notaCondicion}). Revisar seed.`,
      );
    }

    // 9) Transacción: crea Inspeccion + InspeccionDefecto en bloque
    return this.prisma.$transaction(async (tx) => {
      return tx.inspeccion.create({
        data: {
          tipo: input.tipo,
          fecha: input.fecha,
          numeroMuestra: input.numeroMuestra,
          inspectorId,
          fundoId: input.fundoId,
          variedadId: input.variedadId,
          tipoEmbalajeId: input.tipoEmbalajeId,
          clienteId: input.clienteId,
          destinoId: input.destinoId,
          categoria: input.categoria,
          plu: input.plu,
          calibre: input.calibre,
          conteoMuestra: input.conteoMuestra,
          frutosBuenos: input.frutosBuenos,
          calidadEmbalaje: input.calidadEmbalaje,
          rotulacion: input.rotulacion,
          paletizaje: input.paletizaje,
          sumatoriaCalidad: new Prisma.Decimal(sumatoriaCalidad.toFixed(3)),
          sumatoriaCondicion: new Prisma.Decimal(sumatoriaCondicion.toFixed(3)),
          notaCalidad,
          notaCondicion,
          notaFinal: finalLookup.notaFinal,
          resultadoFinal: finalLookup.resultado,
          defectos: {
            create: defectosConPorcentaje.map((d) => ({
              tipoDefectoId: d.tipoDefectoId,
              cantidadFrutos: d.cantidadFrutos,
              porcentajeCalculado: d.porcentajeCalculado,
            })),
          },
        },
        include: {
          defectos: { include: { tipoDefecto: true } },
          fundo: true,
          variedad: true,
          cliente: true,
          destino: true,
          tipoEmbalaje: true,
          inspector: { select: { id: true, nombre: true, apellido: true, email: true } },
        },
      });
    });
  }

  async update(id: string, input: UpdateInspeccionInput, user: JwtPayload) {
    // 1) Verificar que existe + traer defectos actuales para fallback de recálculo
    const existing = await this.prisma.inspeccion.findUnique({
      where: { id },
      include: {
        defectos: { include: { tipoDefecto: { select: { familia: true } } } },
      },
    });
    if (!existing) throw new NotFoundException(`Inspeccion ${id} no encontrada`);
    this.assertCanModify(existing, user);
    if (existing.deletedAt !== null) {
      throw new BadRequestException(
        `Inspeccion ${id} está eliminada. Restaurala antes de editar.`,
      );
    }

    // 2) Validar FK references que vengan en el body (UUIDs no-null)
    await this.validateUpdateReferences(input);

    // 3) Resolver valores efectivos (post-merge) para recálculo
    const efectivoConteo = input.conteoMuestra ?? existing.conteoMuestra;
    const recalcularNotas = input.defectos !== undefined || input.conteoMuestra !== undefined;

    // 4) Si vienen defectos: validar duplicados + cantidadFrutos contra conteo efectivo
    let defectosConPorcentaje:
      | { tipoDefectoId: string; cantidadFrutos: number; porcentajeCalculado: Prisma.Decimal; tipoDefecto: { familia: FamiliaDefecto } }[]
      | null = null;

    if (input.defectos !== undefined) {
      const tipoDefectoIds = input.defectos.map((d) => d.tipoDefectoId);
      if (new Set(tipoDefectoIds).size !== tipoDefectoIds.length) {
        throw new BadRequestException('No se puede cargar el mismo tipo de defecto dos veces');
      }
      if (efectivoConteo === null || efectivoConteo <= 0) {
        throw new BadRequestException('conteoMuestra debe ser mayor a 0 para calcular defectos');
      }
      for (const d of input.defectos) {
        if (d.cantidadFrutos > efectivoConteo) {
          throw new BadRequestException(
            `cantidadFrutos (${d.cantidadFrutos}) supera el conteo total (${efectivoConteo})`,
          );
        }
      }

      if (tipoDefectoIds.length > 0) {
        const tiposDefecto = await this.prisma.tipoDefecto.findMany({
          where: { id: { in: tipoDefectoIds }, activo: true },
        });
        if (tiposDefecto.length !== tipoDefectoIds.length) {
          const encontrados = new Set(tiposDefecto.map((t) => t.id));
          const faltantes = tipoDefectoIds.filter((id) => !encontrados.has(id));
          throw new BadRequestException(
            `Tipos de defecto no encontrados o inactivos: ${faltantes.join(', ')}`,
          );
        }
        const tipoDefectoById = new Map(tiposDefecto.map((t) => [t.id, t]));

        defectosConPorcentaje = input.defectos.map((d) => {
          const tipo = tipoDefectoById.get(d.tipoDefectoId)!;
          const porcentaje = calcularPorcentaje(d.cantidadFrutos, efectivoConteo);
          return {
            tipoDefectoId: d.tipoDefectoId,
            cantidadFrutos: d.cantidadFrutos,
            porcentajeCalculado: new Prisma.Decimal(porcentaje.toFixed(3)),
            tipoDefecto: { familia: tipo.familia },
          };
        });
      } else {
        defectosConPorcentaje = [];
      }
    } else if (recalcularNotas) {
      // Solo cambió conteoMuestra: recalcular porcentajes de los defectos existentes
      if (efectivoConteo === null || efectivoConteo <= 0) {
        throw new BadRequestException('conteoMuestra debe ser mayor a 0 para recalcular');
      }
      // Re-validar que los defectos existentes no excedan el nuevo conteo
      for (const d of existing.defectos) {
        if (d.cantidadFrutos > efectivoConteo) {
          throw new BadRequestException(
            `cantidadFrutos (${d.cantidadFrutos}) supera el nuevo conteo total (${efectivoConteo}). ` +
              `Editá los defectos antes de bajar el conteo.`,
          );
        }
      }
      defectosConPorcentaje = existing.defectos.map((d) => ({
        tipoDefectoId: d.tipoDefectoId,
        cantidadFrutos: d.cantidadFrutos,
        porcentajeCalculado: new Prisma.Decimal(
          calcularPorcentaje(d.cantidadFrutos, efectivoConteo).toFixed(3),
        ),
        tipoDefecto: { familia: d.tipoDefecto.familia },
      }));
    }

    // 4.5) Validar suma exacta: frutosBuenos + Σ defectos = conteoMuestra (efectivos).
    // Si NO se tocaron ni defectos ni conteo ni frutosBuenos, no re-validamos —
    // la inspección original ya pasó por esta regla cuando fue creada.
    const algoCambioEnSuma =
      input.defectos !== undefined ||
      input.conteoMuestra !== undefined ||
      input.frutosBuenos !== undefined;
    if (algoCambioEnSuma) {
      const efectivoFrutosBuenos = input.frutosBuenos ?? existing.frutosBuenos;
      const efectivosDefectos = defectosConPorcentaje ?? existing.defectos;
      const sumaDefectos = efectivosDefectos.reduce(
        (acc, d) => acc + d.cantidadFrutos,
        0,
      );
      if (efectivoFrutosBuenos === null) {
        throw new BadRequestException(
          'frutosBuenos no puede ser nulo al editar (regla: frutosBuenos + Σ defectos = conteoMuestra)',
        );
      }
      if (efectivoConteo === null) {
        throw new BadRequestException('conteoMuestra no puede ser nulo al editar');
      }
      const totalCargado = efectivoFrutosBuenos + sumaDefectos;
      if (totalCargado !== efectivoConteo) {
        throw new BadRequestException(
          `La suma (frutosBuenos=${efectivoFrutosBuenos} + defectos=${sumaDefectos} = ${totalCargado}) ` +
            `debe ser igual al conteo total (${efectivoConteo}). Diferencia: ${totalCargado - efectivoConteo}`,
        );
      }
    }

    // 5) Si toca recalcular: sumatorias + notas + matriz
    let recalcData: {
      sumatoriaCalidad: Prisma.Decimal;
      sumatoriaCondicion: Prisma.Decimal;
      notaCalidad: number;
      notaCondicion: number;
      notaFinal: number;
      resultadoFinal: ResultadoFinal;
    } | null = null;

    if (recalcularNotas && defectosConPorcentaje !== null) {
      const [reglas, matriz] = await Promise.all([
        this.prisma.reglaCalificacion.findMany(),
        this.prisma.matrizCalificacionFinal.findMany(),
      ]);
      const sumCalidad = sumatoriaPorFamilia(defectosConPorcentaje, FamiliaDefecto.CALIDAD);
      const sumCondicion = sumatoriaPorFamilia(defectosConPorcentaje, FamiliaDefecto.CONDICION);
      const notaCalidad = calcularNota(sumCalidad, FamiliaDefecto.CALIDAD, reglas);
      const notaCondicion = calcularNota(sumCondicion, FamiliaDefecto.CONDICION, reglas);
      if (notaCalidad === null || notaCondicion === null) {
        throw new BadRequestException(
          `No se pudo calcular nota: sumCalidad=${sumCalidad} sumCondicion=${sumCondicion}. Revisar reglas_calificacion.`,
        );
      }
      const finalLookup = lookupMatriz(notaCalidad, notaCondicion, matriz);
      if (!finalLookup) {
        throw new BadRequestException(
          `No hay entrada en matriz_calificacion_final para (${notaCalidad}, ${notaCondicion}). Revisar seed.`,
        );
      }
      recalcData = {
        sumatoriaCalidad: new Prisma.Decimal(sumCalidad.toFixed(3)),
        sumatoriaCondicion: new Prisma.Decimal(sumCondicion.toFixed(3)),
        notaCalidad,
        notaCondicion,
        notaFinal: finalLookup.notaFinal,
        resultadoFinal: finalLookup.resultado,
      };
    }

    // 6) Armar el payload de update — solo campos presentes en el input.
    //    Null explícito en el body limpia el campo en DB.
    const data: Prisma.InspeccionUpdateInput = {};
    if (input.tipo !== undefined) data.tipo = input.tipo;
    if (input.fecha !== undefined) data.fecha = input.fecha;
    if (input.numeroMuestra !== undefined) data.numeroMuestra = input.numeroMuestra;
    if (input.fundoId !== undefined) data.fundo = { connect: { id: input.fundoId } };
    if (input.variedadId !== undefined) data.variedad = { connect: { id: input.variedadId } };
    if (input.tipoEmbalajeId !== undefined) {
      data.tipoEmbalaje = input.tipoEmbalajeId === null
        ? { disconnect: true }
        : { connect: { id: input.tipoEmbalajeId } };
    }
    if (input.clienteId !== undefined) {
      data.cliente = input.clienteId === null
        ? { disconnect: true }
        : { connect: { id: input.clienteId } };
    }
    if (input.destinoId !== undefined) {
      data.destino = input.destinoId === null
        ? { disconnect: true }
        : { connect: { id: input.destinoId } };
    }
    if (input.categoria !== undefined) data.categoria = input.categoria;
    if (input.plu !== undefined) data.plu = input.plu;
    if (input.calibre !== undefined) data.calibre = input.calibre;
    if (input.conteoMuestra !== undefined) data.conteoMuestra = input.conteoMuestra;
    if (input.frutosBuenos !== undefined) data.frutosBuenos = input.frutosBuenos;
    if (input.calidadEmbalaje !== undefined) data.calidadEmbalaje = input.calidadEmbalaje;
    if (input.rotulacion !== undefined) data.rotulacion = input.rotulacion;
    if (input.paletizaje !== undefined) data.paletizaje = input.paletizaje;

    if (recalcData) {
      data.sumatoriaCalidad = recalcData.sumatoriaCalidad;
      data.sumatoriaCondicion = recalcData.sumatoriaCondicion;
      data.notaCalidad = recalcData.notaCalidad;
      data.notaCondicion = recalcData.notaCondicion;
      data.notaFinal = recalcData.notaFinal;
      data.resultadoFinal = recalcData.resultadoFinal;
    }

    // 7) Transacción: si llegan defectos, borrar viejos y crear nuevos. Update del registro.
    return this.prisma.$transaction(async (tx) => {
      if (input.defectos !== undefined) {
        await tx.inspeccionDefecto.deleteMany({ where: { inspeccionId: id } });
        if (defectosConPorcentaje && defectosConPorcentaje.length > 0) {
          await tx.inspeccionDefecto.createMany({
            data: defectosConPorcentaje.map((d) => ({
              inspeccionId: id,
              tipoDefectoId: d.tipoDefectoId,
              cantidadFrutos: d.cantidadFrutos,
              porcentajeCalculado: d.porcentajeCalculado,
            })),
          });
        }
      } else if (recalcularNotas && defectosConPorcentaje !== null) {
        // Solo cambió conteoMuestra: actualizar porcentajeCalculado de cada defecto existente
        for (const d of defectosConPorcentaje) {
          await tx.inspeccionDefecto.updateMany({
            where: { inspeccionId: id, tipoDefectoId: d.tipoDefectoId },
            data: { porcentajeCalculado: d.porcentajeCalculado },
          });
        }
      }

      return tx.inspeccion.update({
        where: { id },
        data,
        include: {
          defectos: { include: { tipoDefecto: true } },
          fundo: true,
          variedad: true,
          cliente: true,
          destino: true,
          tipoEmbalaje: true,
          inspector: { select: { id: true, nombre: true, apellido: true, email: true } },
        },
      });
    });
  }

  /**
   * Soft delete. La fila queda viva con deletedAt seteado.
   * Trazabilidad agro: nunca borramos físicamente una inspección — el contenedor
   * que originó esa muestra puede aparecer en una observación de cliente meses después.
   */
  async remove(id: string, user: JwtPayload) {
    const existing = await this.prisma.inspeccion.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, inspectorId: true },
    });
    if (!existing) throw new NotFoundException(`Inspeccion ${id} no encontrada`);
    this.assertCanModify(existing, user);
    if (existing.deletedAt !== null) {
      throw new BadRequestException(`Inspeccion ${id} ya estaba eliminada`);
    }
    await this.prisma.inspeccion.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  /**
   * Restore: anula el soft delete. Admin puede restaurar cualquiera;
   * inspector solo las suyas.
   */
  async restore(id: string, user: JwtPayload) {
    const existing = await this.prisma.inspeccion.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, inspectorId: true },
    });
    if (!existing) throw new NotFoundException(`Inspeccion ${id} no encontrada`);
    this.assertCanModify(existing, user);
    if (existing.deletedAt === null) {
      throw new BadRequestException(`Inspeccion ${id} no está eliminada`);
    }
    await this.prisma.inspeccion.update({
      where: { id },
      data: { deletedAt: null },
    });
    return { id, restored: true };
  }

  /**
   * Verifica que el usuario pueda modificar la inspección.
   * ADMIN: todo. INSPECTOR: solo las propias (inspectorId === user.sub).
   * Tira ForbiddenException (HTTP 403) si no.
   */
  private assertCanModify(
    inspeccion: { inspectorId: string },
    user: JwtPayload,
  ): void {
    if (user.rol === Rol.ADMIN) return;
    if (inspeccion.inspectorId !== user.sub) {
      throw new ForbiddenException(
        'Solo podés modificar inspecciones que cargaste vos',
      );
    }
  }

  async getById(id: string) {
    const insp = await this.prisma.inspeccion.findUnique({
      where: { id, deletedAt: null },
      include: {
        defectos: { include: { tipoDefecto: true } },
        fundo: true,
        variedad: true,
        cliente: true,
        destino: true,
        tipoEmbalaje: true,
        inspector: { select: { id: true, nombre: true, apellido: true, email: true } },
      },
    });
    if (!insp) throw new NotFoundException(`Inspeccion ${id} no encontrada`);
    return insp;
  }

  async list(query: ListInspeccionesQuery) {
    const where: Prisma.InspeccionWhereInput = {
      // Por default solo activas. Admin con incluirEliminadas=true ve el histórico completo.
      ...(query.incluirEliminadas ? {} : { deletedAt: null }),
      ...(query.tipo && { tipo: query.tipo }),
      ...(query.fundoId && { fundoId: query.fundoId }),
      ...(query.variedadId && { variedadId: query.variedadId }),
      ...(query.resultado && { resultadoFinal: query.resultado }),
      ...((query.fechaDesde || query.fechaHasta) && {
        fecha: {
          ...(query.fechaDesde && { gte: query.fechaDesde }),
          ...(query.fechaHasta && { lte: query.fechaHasta }),
        },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inspeccion.findMany({
        where,
        orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          fundo: { select: { nombre: true } },
          variedad: { select: { nombre: true } },
          inspector: { select: { nombre: true, apellido: true } },
        },
      }),
      this.prisma.inspeccion.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  private async validateReferences(input: CreateInspeccionInput) {
    const [fundo, variedad] = await Promise.all([
      this.prisma.fundo.findUnique({ where: { id: input.fundoId } }),
      this.prisma.variedad.findUnique({ where: { id: input.variedadId } }),
    ]);
    if (!fundo) throw new BadRequestException(`Fundo ${input.fundoId} no encontrado`);
    if (!variedad) throw new BadRequestException(`Variedad ${input.variedadId} no encontrada`);

    if (input.tipoEmbalajeId) {
      const tipo = await this.prisma.tipoEmbalaje.findUnique({
        where: { id: input.tipoEmbalajeId },
      });
      if (!tipo) throw new BadRequestException(`TipoEmbalaje ${input.tipoEmbalajeId} no encontrado`);
    }
    if (input.clienteId) {
      const c = await this.prisma.cliente.findUnique({ where: { id: input.clienteId } });
      if (!c) throw new BadRequestException(`Cliente ${input.clienteId} no encontrado`);
    }
    if (input.destinoId) {
      const d = await this.prisma.destino.findUnique({ where: { id: input.destinoId } });
      if (!d) throw new BadRequestException(`Destino ${input.destinoId} no encontrado`);
    }
  }

  // Mismo patrón que validateReferences pero solo valida lo que vino en el body (UUIDs no-null).
  private async validateUpdateReferences(input: UpdateInspeccionInput) {
    if (input.fundoId) {
      const f = await this.prisma.fundo.findUnique({ where: { id: input.fundoId } });
      if (!f) throw new BadRequestException(`Fundo ${input.fundoId} no encontrado`);
    }
    if (input.variedadId) {
      const v = await this.prisma.variedad.findUnique({ where: { id: input.variedadId } });
      if (!v) throw new BadRequestException(`Variedad ${input.variedadId} no encontrada`);
    }
    if (input.tipoEmbalajeId) {
      const t = await this.prisma.tipoEmbalaje.findUnique({ where: { id: input.tipoEmbalajeId } });
      if (!t) throw new BadRequestException(`TipoEmbalaje ${input.tipoEmbalajeId} no encontrado`);
    }
    if (input.clienteId) {
      const c = await this.prisma.cliente.findUnique({ where: { id: input.clienteId } });
      if (!c) throw new BadRequestException(`Cliente ${input.clienteId} no encontrado`);
    }
    if (input.destinoId) {
      const d = await this.prisma.destino.findUnique({ where: { id: input.destinoId } });
      if (!d) throw new BadRequestException(`Destino ${input.destinoId} no encontrado`);
    }
  }
}
