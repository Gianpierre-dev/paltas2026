/**
 * Seed inicial — Paltas2026
 *
 * MODO ACTUAL: SOLO datos imprescindibles del sistema.
 *  - 2 usuarios (admin + inspector con credenciales)
 *  - 8 Reglas de Calificación (configuración crítica del cálculo de notas)
 *  - 16 entradas de Matriz de Calificación Final (configuración crítica)
 *
 * Los catálogos (variedades, fundos, clientes, destinos, embalajes, defectos)
 * los carga el ADMIN desde la UI según necesidad. Las funciones siguen
 * definidas más abajo por si en algún momento querés re-poblar el sistema
 * con datos de prueba: descomentá las llamadas en main().
 *
 * Idempotente: usa upsert. Se puede correr múltiples veces sin duplicar.
 */
import { PrismaClient, FamiliaDefecto, ResultadoFinal, Rol } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedUsuarios() {
  // Credenciales por defecto para dev/staging. En producción reemplazá vía
  // /admin/usuarios y reset-password, NO uses estas en Railway.
  const hash = await bcrypt.hash('123456', 10);

  await prisma.usuario.upsert({
    where: { email: 'admin@paltas.com' },
    update: { passwordHash: hash, activo: true, mustChangePassword: false },
    create: {
      email: 'admin@paltas.com',
      passwordHash: hash,
      nombre: 'Admin',
      apellido: 'Paltas',
      rol: Rol.ADMIN,
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'inspector@paltas.com' },
    update: { passwordHash: hash, activo: true, mustChangePassword: false },
    create: {
      email: 'inspector@paltas.com',
      passwordHash: hash,
      nombre: 'Inspector',
      apellido: 'Demo',
      rol: Rol.INSPECTOR,
    },
  });

  console.log('  [seed] Usuarios: 2 (admin + inspector)');
}

async function seedVariedades() {
  const variedades = ['Hass', 'Zutano', 'Ettinger', 'Maluma'];
  for (const nombre of variedades) {
    await prisma.variedad.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
  console.log(`  [seed] Variedades: ${variedades.length}`);
}

async function seedFundos() {
  const fundos = ['Hefei', 'Mosqueta', 'Pirona'];
  for (const nombre of fundos) {
    await prisma.fundo.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
  console.log(`  [seed] Fundos: ${fundos.length}`);
}

async function seedDestinos() {
  const destinos = [
    'Argentina',
    'Escandinavia',
    'España',
    'Europa',
    'Francia',
    'Grecia',
    'Italia',
    'Japón',
    'Rotterdam',
    'Rusia',
    'Tailandia',
  ];
  for (const nombre of destinos) {
    await prisma.destino.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
  console.log(`  [seed] Destinos: ${destinos.length}`);
}

async function seedClientes() {
  const clientes = [
    'Aartsen',
    'Akhmed Fruit',
    'Az France',
    'Bella Fruta',
    'Camposol',
    'CMR',
    'Coop',
    'Coop Escandinavia',
    'Dan Star',
    'F&G BV Magnit',
    'F&G Gida Ardhzies',
    'F&G Gida Spar',
    'Forever Fresh',
    'Fresh and Good BV',
    'Fresh and Good Gida',
    'Fruit Traders',
    'Fruttital',
    'George Helfer',
    'Halls Europa',
    'Hnos. Fernandez',
    'Pacific Produce',
    'Unifrutti Italia',
    'Unifrutti Japón',
  ];
  for (const nombre of clientes) {
    await prisma.cliente.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
  console.log(`  [seed] Clientes: ${clientes.length}`);
}

async function seedTiposEmbalaje() {
  const embalajes = [
    { codigo: 'C04G', descripcion: 'Genérica 4.0 kg', pesoKg: 4.0, marca: 'Genérica' },
    { codigo: 'C04U', descripcion: 'Unifrutti 4.0 kg', pesoKg: 4.0, marca: 'Unifrutti' },
    { codigo: 'C5.6U', descripcion: 'Unifrutti 5.6 kg', pesoKg: 5.6, marca: 'Unifrutti' },
    { codigo: 'P10G', descripcion: 'Plástico 10.0 kg', pesoKg: 10.0, marca: 'Plástico' },
    { codigo: 'P10G2', descripcion: 'Plástico 10.0 kg v2', pesoKg: 10.0, marca: 'Plástico' },
    { codigo: 'C11.34U', descripcion: 'Unifrutti 11.34 kg', pesoKg: 11.34, marca: 'Unifrutti' },
  ];
  for (const e of embalajes) {
    await prisma.tipoEmbalaje.upsert({
      where: { codigo: e.codigo },
      update: {},
      create: e,
    });
  }
  console.log(`  [seed] Tipos de embalaje: ${embalajes.length}`);
}

async function seedTiposDefecto() {
  const defectos: { nombre: string; familia: FamiliaDefecto; orden: number }[] = [
    // CALIDAD (10 — del Excel)
    { nombre: 'Lenticelas', familia: FamiliaDefecto.CALIDAD, orden: 10 },
    { nombre: 'Trips/Estrías', familia: FamiliaDefecto.CALIDAD, orden: 20 },
    { nombre: 'Deformación', familia: FamiliaDefecto.CALIDAD, orden: 30 },
    { nombre: 'Cicatriz', familia: FamiliaDefecto.CALIDAD, orden: 40 },
    { nombre: 'Russet', familia: FamiliaDefecto.CALIDAD, orden: 50 },
    { nombre: 'Pedúnculo largo', familia: FamiliaDefecto.CALIDAD, orden: 60 },
    { nombre: 'Sombreado', familia: FamiliaDefecto.CALIDAD, orden: 70 },
    { nombre: 'Sin pedúnculo', familia: FamiliaDefecto.CALIDAD, orden: 80 },
    { nombre: 'Golpe de sol', familia: FamiliaDefecto.CALIDAD, orden: 90 },
    { nombre: 'Daño de sol', familia: FamiliaDefecto.CALIDAD, orden: 100 },
    // CONDICION (9 — del Excel)
    { nombre: 'Daño mecánico', familia: FamiliaDefecto.CONDICION, orden: 10 },
    { nombre: 'Golpe/Machucón', familia: FamiliaDefecto.CONDICION, orden: 20 },
    { nombre: 'Sobremaduro/Blando', familia: FamiliaDefecto.CONDICION, orden: 30 },
    { nombre: 'Herida abierta', familia: FamiliaDefecto.CONDICION, orden: 40 },
    { nombre: 'Fumagina', familia: FamiliaDefecto.CONDICION, orden: 50 },
    { nombre: 'Deshidratado', familia: FamiliaDefecto.CONDICION, orden: 60 },
    { nombre: 'Pudrición', familia: FamiliaDefecto.CONDICION, orden: 70 },
    { nombre: 'Hongo', familia: FamiliaDefecto.CONDICION, orden: 80 },
    { nombre: 'Pepa suelta', familia: FamiliaDefecto.CONDICION, orden: 90 },
  ];
  for (const d of defectos) {
    await prisma.tipoDefecto.upsert({
      where: { nombre: d.nombre },
      update: {},
      create: d,
    });
  }
  console.log(`  [seed] Tipos de defecto: ${defectos.length}`);
}

async function seedReglasCalificacion() {
  // PDF/Excel oficial:
  //   CALIDAD:   nota 1 = 1-2.9%, 2 = 3-4.9%, 3 = 5-6.9%, 4 = >=7%
  //   CONDICION: nota 1 = 0%,     2 = 1-2%,   3 = 2.1-4%, 4 = >=4.1%
  //
  // Opción A confirmada: extendemos nota 1 a 0% para cubrir el caso "sin defectos".
  // Para CALIDAD: nota 1 = [0, 3), nota 2 = [3, 5), nota 3 = [5, 7), nota 4 = [7, +inf)
  // Para CONDICION: nota 1 = [0, 1), nota 2 = [1, 2.1), nota 3 = [2.1, 4.1), nota 4 = [4.1, +inf)
  //
  // Convención: porcentajeMin INCLUSIVE, porcentajeMax EXCLUSIVE.
  const reglas = [
    { familia: FamiliaDefecto.CALIDAD, nota: 1, porcentajeMin: 0.0, porcentajeMax: 3.0 },
    { familia: FamiliaDefecto.CALIDAD, nota: 2, porcentajeMin: 3.0, porcentajeMax: 5.0 },
    { familia: FamiliaDefecto.CALIDAD, nota: 3, porcentajeMin: 5.0, porcentajeMax: 7.0 },
    { familia: FamiliaDefecto.CALIDAD, nota: 4, porcentajeMin: 7.0, porcentajeMax: null },

    { familia: FamiliaDefecto.CONDICION, nota: 1, porcentajeMin: 0.0, porcentajeMax: 1.0 },
    { familia: FamiliaDefecto.CONDICION, nota: 2, porcentajeMin: 1.0, porcentajeMax: 2.1 },
    { familia: FamiliaDefecto.CONDICION, nota: 3, porcentajeMin: 2.1, porcentajeMax: 4.1 },
    { familia: FamiliaDefecto.CONDICION, nota: 4, porcentajeMin: 4.1, porcentajeMax: null },
  ];
  for (const r of reglas) {
    await prisma.reglaCalificacion.upsert({
      where: {
        familia_nota: { familia: r.familia, nota: r.nota },
      },
      update: { porcentajeMin: r.porcentajeMin, porcentajeMax: r.porcentajeMax },
      create: r,
    });
  }
  console.log(`  [seed] Reglas de calificación: ${reglas.length}`);
}

async function seedMatriz() {
  // Matriz Calidad × Condición → Resultado Final (del Excel original)
  // Convención: notaFinal = max(notaCalidad, notaCondicion) cuando hay un escalón;
  //             el Excel muestra excepciones que respetamos literalmente acá.
  const matriz = [
    // CalCond  Final  Resultado
    [2, 2, 2, ResultadoFinal.BUENO],
    [3, 2, 2, ResultadoFinal.BUENO],
    [2, 3, 3, ResultadoFinal.ACEPTABLE],
    [4, 3, 3, ResultadoFinal.ACEPTABLE],
    [4, 2, 3, ResultadoFinal.ACEPTABLE],
    [3, 3, 3, ResultadoFinal.ACEPTABLE],
    [2, 4, 4, ResultadoFinal.RECHAZO],
    [3, 4, 4, ResultadoFinal.RECHAZO],
    [4, 4, 4, ResultadoFinal.RECHAZO],
    // Combinaciones con nota 1 (cero defectos en alguna familia) — extrapolamos como BUENO/ACEPTABLE
    [1, 1, 1, ResultadoFinal.BUENO],
    [1, 2, 2, ResultadoFinal.BUENO],
    [1, 3, 3, ResultadoFinal.ACEPTABLE],
    [1, 4, 4, ResultadoFinal.RECHAZO],
    [2, 1, 2, ResultadoFinal.BUENO],
    [3, 1, 3, ResultadoFinal.ACEPTABLE],
    [4, 1, 3, ResultadoFinal.ACEPTABLE],
  ] as const;

  for (const [notaCalidad, notaCondicion, notaFinal, resultado] of matriz) {
    await prisma.matrizCalificacionFinal.upsert({
      where: { notaCalidad_notaCondicion: { notaCalidad, notaCondicion } },
      update: { notaFinal, resultado },
      create: { notaCalidad, notaCondicion, notaFinal, resultado },
    });
  }
  console.log(`  [seed] Matriz calificación final: ${matriz.length}`);
}

async function main() {
  console.log('[seed] Iniciando...');
  await seedUsuarios();
  await seedReglasCalificacion();
  await seedMatriz();
  // Catálogos: necesarios para la migración histórica y para que el admin
  // tenga el inventario inicial disponible. Una vez cargados, el admin
  // puede editarlos o agregar más desde /admin/catalogos.
  await seedVariedades();
  await seedFundos();
  await seedDestinos();
  await seedClientes();
  await seedTiposEmbalaje();
  await seedTiposDefecto();
  console.log('[seed] Completado.');
}

main()
  .catch((e) => {
    console.error('[seed] ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
