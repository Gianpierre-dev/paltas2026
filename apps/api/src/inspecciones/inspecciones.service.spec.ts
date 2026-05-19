import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  Calibre,
  Categoria,
  EvaluacionFisica,
  FamiliaDefecto,
  Prisma,
  ResultadoFinal,
  Rol,
  TipoInspeccion,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type { CreateInspeccionInput, JwtPayload } from '@paltas2026/shared';
import { InspeccionesService } from './inspecciones.service';

const INSPECTOR_OWNER_ID = '55555555-5555-5555-5555-555555555555';
const INSPECTOR_OTHER_ID = '99999999-9999-9999-9999-999999999999';
const ADMIN_USER: JwtPayload = {
  sub: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  email: 'admin@test',
  rol: Rol.ADMIN,
};
const INSPECTOR_OWNER_USER: JwtPayload = {
  sub: INSPECTOR_OWNER_ID,
  email: 'owner@test',
  rol: Rol.INSPECTOR,
};
const INSPECTOR_OTHER_USER: JwtPayload = {
  sub: INSPECTOR_OTHER_ID,
  email: 'other@test',
  rol: Rol.INSPECTOR,
};

// Mock minimal de PrismaService. Solo se mockea lo que el test toca.
type MockTx = {
  inspeccion: {
    create: jest.Mock;
    update: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
  };
  inspeccionDefecto: {
    deleteMany: jest.Mock;
    createMany: jest.Mock;
    updateMany: jest.Mock;
  };
};

interface MockPrisma {
  inspeccion: {
    findUnique: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
    findMany: jest.Mock;
    delete: jest.Mock;
  };
  fundo: { findUnique: jest.Mock };
  variedad: { findUnique: jest.Mock };
  cliente: { findUnique: jest.Mock };
  destino: { findUnique: jest.Mock };
  tipoEmbalaje: { findUnique: jest.Mock };
  tipoDefecto: { findMany: jest.Mock };
  reglaCalificacion: { findMany: jest.Mock };
  matrizCalificacionFinal: { findMany: jest.Mock };
  $transaction: jest.Mock;
}

function buildMockPrisma(): MockPrisma {
  const txInspeccion = {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  };
  const txInspeccionDefecto = {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    updateMany: jest.fn(),
  };
  const tx: MockTx = { inspeccion: txInspeccion, inspeccionDefecto: txInspeccionDefecto };
  const $transaction = jest.fn(async (input: unknown) => {
    if (typeof input === 'function') return (input as (t: MockTx) => unknown)(tx);
    if (Array.isArray(input)) return Promise.all(input);
    return undefined;
  });
  return {
    inspeccion: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    fundo: { findUnique: jest.fn() },
    variedad: { findUnique: jest.fn() },
    cliente: { findUnique: jest.fn() },
    destino: { findUnique: jest.fn() },
    tipoEmbalaje: { findUnique: jest.fn() },
    tipoDefecto: { findMany: jest.fn() },
    reglaCalificacion: { findMany: jest.fn() },
    matrizCalificacionFinal: { findMany: jest.fn() },
    $transaction,
    // @ts-expect-error: exponemos tx para que los tests puedan introspectarlo
    __tx: tx,
  };
}

const FUNDO_ID = '11111111-1111-1111-1111-111111111111';
const VARIEDAD_ID = '22222222-2222-2222-2222-222222222222';
const TIPO_DEFECTO_CALIDAD_ID = '33333333-3333-3333-3333-333333333333';
const TIPO_DEFECTO_CONDICION_ID = '44444444-4444-4444-4444-444444444444';
const INSPECTOR_ID = INSPECTOR_OWNER_ID;
const INSPECCION_ID = '66666666-6666-6666-6666-666666666666';

function buildReglas() {
  return [
    { id: 'r1', familia: FamiliaDefecto.CALIDAD, nota: 1, porcentajeMin: new Decimal(0), porcentajeMax: new Decimal(3), createdAt: new Date(), updatedAt: new Date() },
    { id: 'r2', familia: FamiliaDefecto.CALIDAD, nota: 2, porcentajeMin: new Decimal(3), porcentajeMax: new Decimal(5), createdAt: new Date(), updatedAt: new Date() },
    { id: 'r3', familia: FamiliaDefecto.CALIDAD, nota: 3, porcentajeMin: new Decimal(5), porcentajeMax: new Decimal(7), createdAt: new Date(), updatedAt: new Date() },
    { id: 'r4', familia: FamiliaDefecto.CALIDAD, nota: 4, porcentajeMin: new Decimal(7), porcentajeMax: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 'r5', familia: FamiliaDefecto.CONDICION, nota: 1, porcentajeMin: new Decimal(0), porcentajeMax: new Decimal(1), createdAt: new Date(), updatedAt: new Date() },
    { id: 'r6', familia: FamiliaDefecto.CONDICION, nota: 2, porcentajeMin: new Decimal(1), porcentajeMax: new Decimal(2.1), createdAt: new Date(), updatedAt: new Date() },
    { id: 'r7', familia: FamiliaDefecto.CONDICION, nota: 3, porcentajeMin: new Decimal(2.1), porcentajeMax: new Decimal(4.1), createdAt: new Date(), updatedAt: new Date() },
    { id: 'r8', familia: FamiliaDefecto.CONDICION, nota: 4, porcentajeMin: new Decimal(4.1), porcentajeMax: null, createdAt: new Date(), updatedAt: new Date() },
  ];
}

function buildMatriz() {
  return [
    { id: 'm1', notaCalidad: 1, notaCondicion: 1, notaFinal: 1, resultado: ResultadoFinal.BUENO, createdAt: new Date(), updatedAt: new Date() },
    { id: 'm2', notaCalidad: 1, notaCondicion: 2, notaFinal: 2, resultado: ResultadoFinal.BUENO, createdAt: new Date(), updatedAt: new Date() },
    { id: 'm3', notaCalidad: 2, notaCondicion: 1, notaFinal: 2, resultado: ResultadoFinal.BUENO, createdAt: new Date(), updatedAt: new Date() },
    { id: 'm4', notaCalidad: 4, notaCondicion: 4, notaFinal: 4, resultado: ResultadoFinal.RECHAZO, createdAt: new Date(), updatedAt: new Date() },
  ];
}

function baseInput(overrides: Partial<CreateInspeccionInput> = {}): CreateInspeccionInput {
  return {
    tipo: TipoInspeccion.EXPORTACION,
    fecha: new Date('2026-05-15'),
    fundoId: FUNDO_ID,
    variedadId: VARIEDAD_ID,
    conteoMuestra: 100,
    categoria: Categoria.CAT1,
    calibre: Calibre.C18,
    plu: false,
    calidadEmbalaje: EvaluacionFisica.BUENO,
    rotulacion: EvaluacionFisica.BUENO,
    paletizaje: EvaluacionFisica.BUENO,
    defectos: [{ tipoDefectoId: TIPO_DEFECTO_CALIDAD_ID, cantidadFrutos: 2 }],
    ...overrides,
  };
}

describe('InspeccionesService', () => {
  let prisma: MockPrisma;
  let service: InspeccionesService;

  beforeEach(() => {
    prisma = buildMockPrisma();
    service = new InspeccionesService(prisma as unknown as ConstructorParameters<typeof InspeccionesService>[0]);
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.fundo.findUnique.mockResolvedValue({ id: FUNDO_ID, nombre: 'Fundo A', activo: true });
      prisma.variedad.findUnique.mockResolvedValue({ id: VARIEDAD_ID, nombre: 'Hass', activo: true });
      // Simulamos el filtro WHERE id IN (...): devolvemos solo los tipos pedidos.
      prisma.tipoDefecto.findMany.mockImplementation(({ where }: { where: { id: { in: string[] } } }) => {
        const allTipos = [
          { id: TIPO_DEFECTO_CALIDAD_ID, familia: FamiliaDefecto.CALIDAD, activo: true, nombre: 'X', orden: 0 },
          { id: TIPO_DEFECTO_CONDICION_ID, familia: FamiliaDefecto.CONDICION, activo: true, nombre: 'Y', orden: 0 },
        ];
        const requested = new Set(where.id.in);
        return Promise.resolve(allTipos.filter((t) => requested.has(t.id)));
      });
      prisma.reglaCalificacion.findMany.mockResolvedValue(buildReglas());
      prisma.matrizCalificacionFinal.findMany.mockResolvedValue(buildMatriz());
    });

    it('crea inspección y devuelve calculo de notas (happy path)', async () => {
      // @ts-expect-error introspección de tx mockeado
      const tx = prisma.__tx as MockTx;
      tx.inspeccion.create.mockResolvedValue({ id: INSPECCION_ID });

      await service.create(INSPECTOR_ID, baseInput());

      expect(tx.inspeccion.create).toHaveBeenCalledTimes(1);
      const args = tx.inspeccion.create.mock.calls[0][0];
      expect(args.data.notaCalidad).toBe(1); // 2% < 3 → nota 1
      expect(args.data.notaCondicion).toBe(1); // sin defectos condición → 0% → nota 1
      expect(args.data.resultadoFinal).toBe(ResultadoFinal.BUENO);
      expect(args.data.defectos.create).toHaveLength(1);
    });

    it('rebota si hay defectos duplicados', async () => {
      const input = baseInput({
        defectos: [
          { tipoDefectoId: TIPO_DEFECTO_CALIDAD_ID, cantidadFrutos: 1 },
          { tipoDefectoId: TIPO_DEFECTO_CALIDAD_ID, cantidadFrutos: 2 },
        ],
      });
      await expect(service.create(INSPECTOR_ID, input)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rebota si cantidadFrutos > conteoMuestra', async () => {
      const input = baseInput({
        conteoMuestra: 10,
        defectos: [{ tipoDefectoId: TIPO_DEFECTO_CALIDAD_ID, cantidadFrutos: 15 }],
      });
      await expect(service.create(INSPECTOR_ID, input)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rebota si fundoId no existe', async () => {
      prisma.fundo.findUnique.mockResolvedValue(null);
      await expect(service.create(INSPECTOR_ID, baseInput())).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rebota si tipo de defecto no existe o está inactivo', async () => {
      prisma.tipoDefecto.findMany.mockResolvedValue([]); // ninguno encontrado
      await expect(service.create(INSPECTOR_ID, baseInput())).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    function existingInspeccion(overrides: Record<string, unknown> = {}) {
      return {
        id: INSPECCION_ID,
        conteoMuestra: 100,
        deletedAt: null,
        inspectorId: INSPECTOR_OWNER_ID,
        defectos: [
          {
            id: 'd1',
            tipoDefectoId: TIPO_DEFECTO_CALIDAD_ID,
            cantidadFrutos: 2,
            porcentajeCalculado: new Decimal(2),
            tipoDefecto: { familia: FamiliaDefecto.CALIDAD },
          },
        ],
        ...overrides,
      };
    }

    it('rebota si inspección está soft-deleted', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue(existingInspeccion({ deletedAt: new Date() }));
      await expect(service.update(INSPECCION_ID, { conteoMuestra: 200 }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rebota si inspección no existe', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue(null);
      await expect(service.update(INSPECCION_ID, { conteoMuestra: 200 }, ADMIN_USER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('cuando solo cambia conteoMuestra, recalcula porcentajes de defectos existentes', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue(existingInspeccion({ conteoMuestra: 100 }));
      prisma.reglaCalificacion.findMany.mockResolvedValue(buildReglas());
      prisma.matrizCalificacionFinal.findMany.mockResolvedValue(buildMatriz());
      // @ts-expect-error tx
      const tx = prisma.__tx as MockTx;
      tx.inspeccion.update.mockResolvedValue({ id: INSPECCION_ID });

      await service.update(INSPECCION_ID, { conteoMuestra: 200 }, ADMIN_USER);

      expect(tx.inspeccionDefecto.updateMany).toHaveBeenCalledWith({
        where: { inspeccionId: INSPECCION_ID, tipoDefectoId: TIPO_DEFECTO_CALIDAD_ID },
        data: { porcentajeCalculado: new Prisma.Decimal('1.000') }, // 2 / 200 * 100 = 1.000
      });
    });

    it('si los defectos existentes superan el nuevo conteo, rebota antes de tocar DB', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue(
        existingInspeccion({
          defectos: [
            {
              id: 'd1',
              tipoDefectoId: TIPO_DEFECTO_CALIDAD_ID,
              cantidadFrutos: 50,
              porcentajeCalculado: new Decimal(50),
              tipoDefecto: { familia: FamiliaDefecto.CALIDAD },
            },
          ],
        }),
      );
      await expect(service.update(INSPECCION_ID, { conteoMuestra: 10 }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('INSPECTOR puede editar SU PROPIA inspección', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue(existingInspeccion());
      prisma.reglaCalificacion.findMany.mockResolvedValue(buildReglas());
      prisma.matrizCalificacionFinal.findMany.mockResolvedValue(buildMatriz());
      // @ts-expect-error tx
      const tx = prisma.__tx as MockTx;
      tx.inspeccion.update.mockResolvedValue({ id: INSPECCION_ID });

      await expect(
        service.update(INSPECCION_ID, { conteoMuestra: 200 }, INSPECTOR_OWNER_USER),
      ).resolves.toBeDefined();
    });

    it('INSPECTOR NO puede editar inspección de OTRO inspector', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue(existingInspeccion());
      await expect(
        service.update(INSPECCION_ID, { conteoMuestra: 200 }, INSPECTOR_OTHER_USER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('remove (soft delete)', () => {
    it('setea deletedAt en vez de borrar la fila', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue({
        id: INSPECCION_ID,
        deletedAt: null,
        inspectorId: INSPECTOR_OWNER_ID,
      });
      prisma.inspeccion.update.mockResolvedValue({});

      await service.remove(INSPECCION_ID, ADMIN_USER);

      expect(prisma.inspeccion.delete).not.toHaveBeenCalled();
      expect(prisma.inspeccion.update).toHaveBeenCalledWith({
        where: { id: INSPECCION_ID },
        data: { deletedAt: expect.any(Date) as Date },
      });
    });

    it('rebota si la inspección ya estaba eliminada', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue({
        id: INSPECCION_ID,
        deletedAt: new Date(),
        inspectorId: INSPECTOR_OWNER_ID,
      });
      await expect(service.remove(INSPECCION_ID, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rebota si la inspección no existe', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue(null);
      await expect(service.remove(INSPECCION_ID, ADMIN_USER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('INSPECTOR puede eliminar SU PROPIA inspección', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue({
        id: INSPECCION_ID,
        deletedAt: null,
        inspectorId: INSPECTOR_OWNER_ID,
      });
      prisma.inspeccion.update.mockResolvedValue({});
      await expect(service.remove(INSPECCION_ID, INSPECTOR_OWNER_USER)).resolves.toEqual({
        id: INSPECCION_ID,
        deleted: true,
      });
    });

    it('INSPECTOR NO puede eliminar inspección de OTRO inspector', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue({
        id: INSPECCION_ID,
        deletedAt: null,
        inspectorId: INSPECTOR_OWNER_ID,
      });
      await expect(service.remove(INSPECCION_ID, INSPECTOR_OTHER_USER)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('restore', () => {
    it('limpia deletedAt cuando la inspección está eliminada', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue({
        id: INSPECCION_ID,
        deletedAt: new Date(),
        inspectorId: INSPECTOR_OWNER_ID,
      });
      prisma.inspeccion.update.mockResolvedValue({});

      await service.restore(INSPECCION_ID, ADMIN_USER);

      expect(prisma.inspeccion.update).toHaveBeenCalledWith({
        where: { id: INSPECCION_ID },
        data: { deletedAt: null },
      });
    });

    it('rebota si la inspección NO estaba eliminada', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue({
        id: INSPECCION_ID,
        deletedAt: null,
        inspectorId: INSPECTOR_OWNER_ID,
      });
      await expect(service.restore(INSPECCION_ID, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('INSPECTOR NO puede restaurar inspección de OTRO inspector', async () => {
      prisma.inspeccion.findUnique.mockResolvedValue({
        id: INSPECCION_ID,
        deletedAt: new Date(),
        inspectorId: INSPECTOR_OWNER_ID,
      });
      await expect(service.restore(INSPECCION_ID, INSPECTOR_OTHER_USER)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('list', () => {
    it('por default excluye inspecciones eliminadas', async () => {
      prisma.inspeccion.findMany.mockResolvedValue([]);
      prisma.inspeccion.count.mockResolvedValue(0);

      await service.list({
        incluirEliminadas: false,
        page: 1,
        pageSize: 50,
      });

      const findManyCall = prisma.inspeccion.findMany.mock.calls[0][0];
      expect(findManyCall.where.deletedAt).toBeNull();
    });

    it('con incluirEliminadas=true NO filtra por deletedAt', async () => {
      prisma.inspeccion.findMany.mockResolvedValue([]);
      prisma.inspeccion.count.mockResolvedValue(0);

      await service.list({
        incluirEliminadas: true,
        page: 1,
        pageSize: 50,
      });

      const findManyCall = prisma.inspeccion.findMany.mock.calls[0][0];
      expect(findManyCall.where.deletedAt).toBeUndefined();
    });
  });
});
