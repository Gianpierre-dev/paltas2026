import { FamiliaDefecto, ResultadoFinal, type MatrizCalificacionFinal, type ReglaCalificacion } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calcularNota,
  calcularPorcentaje,
  lookupMatriz,
  sumatoriaPorFamilia,
} from './calificacion';

// ============================================================
// Fixtures: replican EXACTAMENTE el seed (alineado al PDF oficial)
// ============================================================

const reglasFixture: ReglaCalificacion[] = [
  // CALIDAD: nota 1 = [0,3), 2 = [3,5), 3 = [5,7), 4 = [7, +inf)
  fixtureRegla('CALIDAD', 1, 0, 3),
  fixtureRegla('CALIDAD', 2, 3, 5),
  fixtureRegla('CALIDAD', 3, 5, 7),
  fixtureRegla('CALIDAD', 4, 7, null),
  // CONDICION: nota 1 = [0,1), 2 = [1,2.1), 3 = [2.1,4.1), 4 = [4.1, +inf)
  fixtureRegla('CONDICION', 1, 0, 1),
  fixtureRegla('CONDICION', 2, 1, 2.1),
  fixtureRegla('CONDICION', 3, 2.1, 4.1),
  fixtureRegla('CONDICION', 4, 4.1, null),
];

const matrizFixture: MatrizCalificacionFinal[] = [
  // Combinaciones del PDF oficial (sin nota 1)
  fixtureMatriz(2, 2, 2, ResultadoFinal.BUENO),
  fixtureMatriz(3, 2, 2, ResultadoFinal.BUENO),
  fixtureMatriz(2, 3, 3, ResultadoFinal.ACEPTABLE),
  fixtureMatriz(4, 3, 3, ResultadoFinal.ACEPTABLE),
  fixtureMatriz(4, 2, 3, ResultadoFinal.ACEPTABLE),
  fixtureMatriz(3, 3, 3, ResultadoFinal.ACEPTABLE),
  fixtureMatriz(2, 4, 4, ResultadoFinal.RECHAZO),
  fixtureMatriz(3, 4, 4, ResultadoFinal.RECHAZO),
  fixtureMatriz(4, 4, 4, ResultadoFinal.RECHAZO),
  // Combinaciones extendidas para nota 1
  fixtureMatriz(1, 1, 1, ResultadoFinal.BUENO),
  fixtureMatriz(1, 2, 2, ResultadoFinal.BUENO),
  fixtureMatriz(1, 3, 3, ResultadoFinal.ACEPTABLE),
  fixtureMatriz(1, 4, 4, ResultadoFinal.RECHAZO),
  fixtureMatriz(2, 1, 2, ResultadoFinal.BUENO),
  fixtureMatriz(3, 1, 3, ResultadoFinal.ACEPTABLE),
  fixtureMatriz(4, 1, 3, ResultadoFinal.ACEPTABLE),
];

// ============================================================
// calcularPorcentaje
// ============================================================

describe('calcularPorcentaje', () => {
  it('calcula porcentaje correctamente', () => {
    expect(calcularPorcentaje(1, 100)).toBe(1);
    expect(calcularPorcentaje(5, 100)).toBe(5);
    expect(calcularPorcentaje(7, 100)).toBe(7);
  });

  it('maneja conteos no múltiplos de 100', () => {
    expect(calcularPorcentaje(1, 24)).toBeCloseTo(4.1667, 4);
    expect(calcularPorcentaje(3, 75)).toBe(4);
  });

  it('devuelve 0 cuando no hay frutos defectuosos', () => {
    expect(calcularPorcentaje(0, 100)).toBe(0);
  });

  it('devuelve 100 cuando todos los frutos están defectuosos', () => {
    expect(calcularPorcentaje(50, 50)).toBe(100);
  });

  it('lanza si conteoTotal es 0', () => {
    expect(() => calcularPorcentaje(1, 0)).toThrow('conteoTotal debe ser > 0');
  });

  it('lanza si conteoTotal es negativo', () => {
    expect(() => calcularPorcentaje(1, -5)).toThrow('conteoTotal debe ser > 0');
  });
});

// ============================================================
// calcularNota — CALIDAD
// ============================================================

describe('calcularNota CALIDAD', () => {
  it('nota 1 cuando porcentaje es 0%', () => {
    expect(calcularNota(0, FamiliaDefecto.CALIDAD, reglasFixture)).toBe(1);
  });

  it('nota 1 para 2.99% (límite superior exclusivo)', () => {
    expect(calcularNota(2.99, FamiliaDefecto.CALIDAD, reglasFixture)).toBe(1);
  });

  it('nota 2 cuando porcentaje es exactamente 3% (borde inclusivo)', () => {
    expect(calcularNota(3, FamiliaDefecto.CALIDAD, reglasFixture)).toBe(2);
  });

  it('nota 2 para 4.9%', () => {
    expect(calcularNota(4.9, FamiliaDefecto.CALIDAD, reglasFixture)).toBe(2);
  });

  it('nota 3 cuando porcentaje es 5% (borde inclusivo)', () => {
    expect(calcularNota(5, FamiliaDefecto.CALIDAD, reglasFixture)).toBe(3);
  });

  it('nota 3 para 6.99%', () => {
    expect(calcularNota(6.99, FamiliaDefecto.CALIDAD, reglasFixture)).toBe(3);
  });

  it('nota 4 cuando porcentaje es exactamente 7% (borde inclusivo)', () => {
    expect(calcularNota(7, FamiliaDefecto.CALIDAD, reglasFixture)).toBe(4);
  });

  it('nota 4 para porcentajes altos', () => {
    expect(calcularNota(15, FamiliaDefecto.CALIDAD, reglasFixture)).toBe(4);
    expect(calcularNota(100, FamiliaDefecto.CALIDAD, reglasFixture)).toBe(4);
  });
});

// ============================================================
// calcularNota — CONDICION
// ============================================================

describe('calcularNota CONDICION', () => {
  it('nota 1 cuando porcentaje es 0%', () => {
    expect(calcularNota(0, FamiliaDefecto.CONDICION, reglasFixture)).toBe(1);
  });

  it('nota 1 para 0.99%', () => {
    expect(calcularNota(0.99, FamiliaDefecto.CONDICION, reglasFixture)).toBe(1);
  });

  it('nota 2 para 1% exacto (borde inclusivo)', () => {
    expect(calcularNota(1, FamiliaDefecto.CONDICION, reglasFixture)).toBe(2);
  });

  it('nota 2 para 2%', () => {
    expect(calcularNota(2, FamiliaDefecto.CONDICION, reglasFixture)).toBe(2);
  });

  it('nota 3 para 2.1% (borde inclusivo)', () => {
    expect(calcularNota(2.1, FamiliaDefecto.CONDICION, reglasFixture)).toBe(3);
  });

  it('nota 3 para 4%', () => {
    expect(calcularNota(4, FamiliaDefecto.CONDICION, reglasFixture)).toBe(3);
  });

  it('nota 4 para 4.1% (borde inclusivo)', () => {
    expect(calcularNota(4.1, FamiliaDefecto.CONDICION, reglasFixture)).toBe(4);
  });

  it('nota 4 para 10%', () => {
    expect(calcularNota(10, FamiliaDefecto.CONDICION, reglasFixture)).toBe(4);
  });
});

describe('calcularNota — robustness', () => {
  it('devuelve null si no hay reglas para esa familia', () => {
    const reglasSoloCalidad = reglasFixture.filter((r) => r.familia === FamiliaDefecto.CALIDAD);
    expect(calcularNota(0, FamiliaDefecto.CONDICION, reglasSoloCalidad)).toBeNull();
  });

  it('devuelve null si el porcentaje es negativo (no debería pasar)', () => {
    expect(calcularNota(-1, FamiliaDefecto.CALIDAD, reglasFixture)).toBeNull();
  });
});

// ============================================================
// lookupMatriz
// ============================================================

describe('lookupMatriz', () => {
  it('(2,2) -> BUENO', () => {
    const r = lookupMatriz(2, 2, matrizFixture);
    expect(r).toEqual({ notaFinal: 2, resultado: ResultadoFinal.BUENO });
  });

  it('(3,3) -> ACEPTABLE', () => {
    expect(lookupMatriz(3, 3, matrizFixture)).toEqual({
      notaFinal: 3,
      resultado: ResultadoFinal.ACEPTABLE,
    });
  });

  it('(4,4) -> RECHAZO', () => {
    expect(lookupMatriz(4, 4, matrizFixture)).toEqual({
      notaFinal: 4,
      resultado: ResultadoFinal.RECHAZO,
    });
  });

  it('(2,4) -> RECHAZO (mismo final que (4,2) ACEPTABLE — son distintos según PDF)', () => {
    expect(lookupMatriz(2, 4, matrizFixture)).toEqual({
      notaFinal: 4,
      resultado: ResultadoFinal.RECHAZO,
    });
    expect(lookupMatriz(4, 2, matrizFixture)).toEqual({
      notaFinal: 3,
      resultado: ResultadoFinal.ACEPTABLE,
    });
  });

  it('(1,1) -> BUENO (combinación extendida)', () => {
    expect(lookupMatriz(1, 1, matrizFixture)).toEqual({
      notaFinal: 1,
      resultado: ResultadoFinal.BUENO,
    });
  });

  it('devuelve null si la combinación no existe en la matriz', () => {
    expect(lookupMatriz(5, 5, matrizFixture)).toBeNull();
    expect(lookupMatriz(0, 0, matrizFixture)).toBeNull();
  });
});

// ============================================================
// sumatoriaPorFamilia
// ============================================================

describe('sumatoriaPorFamilia', () => {
  it('suma porcentajes solo de la familia indicada', () => {
    const defectos = [
      defectoFixture(2.5, FamiliaDefecto.CALIDAD),
      defectoFixture(1.3, FamiliaDefecto.CALIDAD),
      defectoFixture(0.8, FamiliaDefecto.CONDICION),
    ];
    expect(sumatoriaPorFamilia(defectos, FamiliaDefecto.CALIDAD)).toBeCloseTo(3.8, 5);
    expect(sumatoriaPorFamilia(defectos, FamiliaDefecto.CONDICION)).toBeCloseTo(0.8, 5);
  });

  it('devuelve 0 si no hay defectos de esa familia', () => {
    const defectos = [defectoFixture(2.5, FamiliaDefecto.CALIDAD)];
    expect(sumatoriaPorFamilia(defectos, FamiliaDefecto.CONDICION)).toBe(0);
  });

  it('acepta tanto Decimal como number en porcentajeCalculado', () => {
    const defectos = [
      defectoFixture(new Decimal('2.500'), FamiliaDefecto.CALIDAD),
      defectoFixture(1.5, FamiliaDefecto.CALIDAD),
    ];
    expect(sumatoriaPorFamilia(defectos, FamiliaDefecto.CALIDAD)).toBe(4);
  });

  it('devuelve 0 con array vacío', () => {
    expect(sumatoriaPorFamilia([], FamiliaDefecto.CALIDAD)).toBe(0);
  });
});

// ============================================================
// Integration: flujo completo (pipe de funciones)
// ============================================================

describe('Pipeline completo: defectos -> sumatoria -> nota -> matriz', () => {
  function pipeline(
    defectos: { porcentaje: number; familia: FamiliaDefecto }[],
  ): { notaCal: number | null; notaCond: number | null; final: ReturnType<typeof lookupMatriz> } {
    const ds = defectos.map((d) => defectoFixture(d.porcentaje, d.familia));
    const sumCal = sumatoriaPorFamilia(ds, FamiliaDefecto.CALIDAD);
    const sumCond = sumatoriaPorFamilia(ds, FamiliaDefecto.CONDICION);
    const notaCal = calcularNota(sumCal, FamiliaDefecto.CALIDAD, reglasFixture);
    const notaCond = calcularNota(sumCond, FamiliaDefecto.CONDICION, reglasFixture);
    const final = notaCal !== null && notaCond !== null
      ? lookupMatriz(notaCal, notaCond, matrizFixture)
      : null;
    return { notaCal, notaCond, final };
  }

  it('caso BUENO bajo: 2% cal + 0% cond', () => {
    const r = pipeline([
      { porcentaje: 1, familia: FamiliaDefecto.CALIDAD },
      { porcentaje: 1, familia: FamiliaDefecto.CALIDAD },
    ]);
    expect(r.notaCal).toBe(1);
    expect(r.notaCond).toBe(1);
    expect(r.final?.resultado).toBe(ResultadoFinal.BUENO);
  });

  it('caso BUENO medio: 5% cal + 2% cond -> (3,2) BUENO segun matriz', () => {
    const r = pipeline([
      { porcentaje: 4, familia: FamiliaDefecto.CALIDAD },
      { porcentaje: 1, familia: FamiliaDefecto.CALIDAD },
      { porcentaje: 2, familia: FamiliaDefecto.CONDICION },
    ]);
    expect(r.notaCal).toBe(3);
    expect(r.notaCond).toBe(2);
    expect(r.final?.resultado).toBe(ResultadoFinal.BUENO);
  });

  it('caso RECHAZO: 1% cal + 6% cond -> (1,4) RECHAZO', () => {
    const r = pipeline([
      { porcentaje: 1, familia: FamiliaDefecto.CALIDAD },
      { porcentaje: 6, familia: FamiliaDefecto.CONDICION },
    ]);
    expect(r.notaCal).toBe(1);
    expect(r.notaCond).toBe(4);
    expect(r.final?.resultado).toBe(ResultadoFinal.RECHAZO);
  });

  it('caso RECHAZO total: 8% cal + 5% cond -> (4,4) RECHAZO', () => {
    const r = pipeline([
      { porcentaje: 5, familia: FamiliaDefecto.CALIDAD },
      { porcentaje: 3, familia: FamiliaDefecto.CALIDAD },
      { porcentaje: 5, familia: FamiliaDefecto.CONDICION },
    ]);
    expect(r.notaCal).toBe(4);
    expect(r.notaCond).toBe(4);
    expect(r.final?.resultado).toBe(ResultadoFinal.RECHAZO);
  });
});

// ============================================================
// Helpers
// ============================================================

function fixtureRegla(
  familia: FamiliaDefecto,
  nota: number,
  min: number,
  max: number | null,
): ReglaCalificacion {
  return {
    id: `regla-${familia}-${nota}`,
    familia,
    nota,
    porcentajeMin: new Decimal(min),
    porcentajeMax: max !== null ? new Decimal(max) : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function fixtureMatriz(
  notaCalidad: number,
  notaCondicion: number,
  notaFinal: number,
  resultado: ResultadoFinal,
): MatrizCalificacionFinal {
  return {
    id: `matriz-${notaCalidad}-${notaCondicion}`,
    notaCalidad,
    notaCondicion,
    notaFinal,
    resultado,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function defectoFixture(porcentaje: number | Decimal, familia: FamiliaDefecto) {
  return {
    porcentajeCalculado: porcentaje,
    tipoDefecto: { familia },
  };
}
