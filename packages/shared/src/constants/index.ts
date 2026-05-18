// Enums replicados del schema.prisma para uso compartido entre back y front.
// Si cambian en Prisma, hay que actualizarlos acá también.
// TODO: evaluar generador automático Prisma -> shared en una iteración futura.

export const Rol = {
  ADMIN: 'ADMIN',
  INSPECTOR: 'INSPECTOR',
} as const;
export type Rol = (typeof Rol)[keyof typeof Rol];

export const FamiliaDefecto = {
  CALIDAD: 'CALIDAD',
  CONDICION: 'CONDICION',
} as const;
export type FamiliaDefecto = (typeof FamiliaDefecto)[keyof typeof FamiliaDefecto];

export const TipoInspeccion = {
  EXPORTACION: 'EXPORTACION',
  DESCARTE: 'DESCARTE',
  RECEPCION: 'RECEPCION',
} as const;
export type TipoInspeccion = (typeof TipoInspeccion)[keyof typeof TipoInspeccion];

// PDF (Sección 2): BUENO / ACEPTABLE / MALO — para calidad de embalaje, rotulación, paletizaje
export const EvaluacionFisica = {
  BUENO: 'BUENO',
  ACEPTABLE: 'ACEPTABLE',
  MALO: 'MALO',
} as const;
export type EvaluacionFisica = (typeof EvaluacionFisica)[keyof typeof EvaluacionFisica];

// Resultado del cruce calidad x condicion — sigue siendo RECHAZO (no MALO).
// Conceptualmente distinto: el embalaje puede estar "malo" (físicamente),
// pero la fruta termina "rechazada" para exportación.
export const ResultadoFinal = {
  BUENO: 'BUENO',
  ACEPTABLE: 'ACEPTABLE',
  RECHAZO: 'RECHAZO',
} as const;
export type ResultadoFinal = (typeof ResultadoFinal)[keyof typeof ResultadoFinal];

// PDF (Sección 1): solo CAT1 / CAT2
export const Categoria = {
  CAT1: 'CAT1',
  CAT2: 'CAT2',
} as const;
export type Categoria = (typeof Categoria)[keyof typeof Categoria];

// PDF (Sección 2): valores fijos del negocio
export const Calibre = {
  C08: 'C08',
  C10: 'C10',
  C12: 'C12',
  C14: 'C14',
  C16: 'C16',
  C18: 'C18',
  C20: 'C20',
  C22: 'C22',
  C24: 'C24',
  C30: 'C30',
} as const;
export type Calibre = (typeof Calibre)[keyof typeof Calibre];

// Helper: lista ordenada de calibres con su valor numérico para UI
export const CALIBRES_ORDENADOS: { codigo: Calibre; valor: number }[] = [
  { codigo: 'C08', valor: 8 },
  { codigo: 'C10', valor: 10 },
  { codigo: 'C12', valor: 12 },
  { codigo: 'C14', valor: 14 },
  { codigo: 'C16', valor: 16 },
  { codigo: 'C18', valor: 18 },
  { codigo: 'C20', valor: 20 },
  { codigo: 'C22', valor: 22 },
  { codigo: 'C24', valor: 24 },
  { codigo: 'C30', valor: 30 },
];
