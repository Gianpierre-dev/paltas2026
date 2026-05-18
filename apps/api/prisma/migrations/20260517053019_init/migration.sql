-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'INSPECTOR');

-- CreateEnum
CREATE TYPE "FamiliaDefecto" AS ENUM ('CALIDAD', 'CONDICION');

-- CreateEnum
CREATE TYPE "TipoInspeccion" AS ENUM ('EXPORTACION', 'DESCARTE', 'RECEPCION');

-- CreateEnum
CREATE TYPE "EvaluacionFisica" AS ENUM ('BUENO', 'ACEPTABLE', 'MALO');

-- CreateEnum
CREATE TYPE "ResultadoFinal" AS ENUM ('BUENO', 'ACEPTABLE', 'RECHAZO');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('CAT1', 'CAT2');

-- CreateEnum
CREATE TYPE "Calibre" AS ENUM ('C08', 'C10', 'C12', 'C14', 'C16', 'C18', 'C20', 'C22', 'C24', 'C30');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'INSPECTOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fundos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fundos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variedades" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variedades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_embalaje" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "peso_kg" DECIMAL(6,2) NOT NULL,
    "marca" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_embalaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_defecto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "familia" "FamiliaDefecto" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_defecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas_calificacion" (
    "id" TEXT NOT NULL,
    "familia" "FamiliaDefecto" NOT NULL,
    "nota" INTEGER NOT NULL,
    "porcentaje_min" DECIMAL(5,2) NOT NULL,
    "porcentaje_max" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reglas_calificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriz_calificacion_final" (
    "id" TEXT NOT NULL,
    "nota_calidad" INTEGER NOT NULL,
    "nota_condicion" INTEGER NOT NULL,
    "nota_final" INTEGER NOT NULL,
    "resultado" "ResultadoFinal" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matriz_calificacion_final_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspecciones" (
    "id" TEXT NOT NULL,
    "tipo" "TipoInspeccion" NOT NULL,
    "fecha" DATE NOT NULL,
    "numero_muestra" INTEGER,
    "inspector_id" TEXT NOT NULL,
    "fundo_id" TEXT NOT NULL,
    "variedad_id" TEXT NOT NULL,
    "tipo_embalaje_id" TEXT,
    "cliente_id" TEXT,
    "destino_id" TEXT,
    "categoria" "Categoria",
    "plu" BOOLEAN,
    "calibre" "Calibre",
    "conteo_muestra" INTEGER,
    "calidad_embalaje" "EvaluacionFisica",
    "rotulacion" "EvaluacionFisica",
    "paletizaje" "EvaluacionFisica",
    "sumatoria_calidad" DECIMAL(6,3),
    "sumatoria_condicion" DECIMAL(6,3),
    "nota_calidad" INTEGER,
    "nota_condicion" INTEGER,
    "nota_final" INTEGER,
    "resultado_final" "ResultadoFinal",
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspecciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion_defectos" (
    "id" TEXT NOT NULL,
    "inspeccion_id" TEXT NOT NULL,
    "tipo_defecto_id" TEXT NOT NULL,
    "cantidad_frutos" INTEGER NOT NULL,
    "porcentaje_calculado" DECIMAL(6,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspeccion_defectos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fundos_nombre_key" ON "fundos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "variedades_nombre_key" ON "variedades"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_nombre_key" ON "clientes"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "destinos_nombre_key" ON "destinos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_embalaje_codigo_key" ON "tipos_embalaje"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_defecto_nombre_key" ON "tipos_defecto"("nombre");

-- CreateIndex
CREATE INDEX "tipos_defecto_familia_activo_idx" ON "tipos_defecto"("familia", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "reglas_calificacion_familia_nota_key" ON "reglas_calificacion"("familia", "nota");

-- CreateIndex
CREATE UNIQUE INDEX "matriz_calificacion_final_nota_calidad_nota_condicion_key" ON "matriz_calificacion_final"("nota_calidad", "nota_condicion");

-- CreateIndex
CREATE INDEX "inspecciones_fecha_idx" ON "inspecciones"("fecha");

-- CreateIndex
CREATE INDEX "inspecciones_tipo_fecha_idx" ON "inspecciones"("tipo", "fecha");

-- CreateIndex
CREATE INDEX "inspecciones_fundo_id_fecha_idx" ON "inspecciones"("fundo_id", "fecha");

-- CreateIndex
CREATE INDEX "inspecciones_variedad_id_fecha_idx" ON "inspecciones"("variedad_id", "fecha");

-- CreateIndex
CREATE INDEX "inspecciones_inspector_id_fecha_idx" ON "inspecciones"("inspector_id", "fecha");

-- CreateIndex
CREATE INDEX "inspeccion_defectos_tipo_defecto_id_idx" ON "inspeccion_defectos"("tipo_defecto_id");

-- CreateIndex
CREATE UNIQUE INDEX "inspeccion_defectos_inspeccion_id_tipo_defecto_id_key" ON "inspeccion_defectos"("inspeccion_id", "tipo_defecto_id");

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_fundo_id_fkey" FOREIGN KEY ("fundo_id") REFERENCES "fundos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_variedad_id_fkey" FOREIGN KEY ("variedad_id") REFERENCES "variedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_tipo_embalaje_id_fkey" FOREIGN KEY ("tipo_embalaje_id") REFERENCES "tipos_embalaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "destinos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_defectos" ADD CONSTRAINT "inspeccion_defectos_inspeccion_id_fkey" FOREIGN KEY ("inspeccion_id") REFERENCES "inspecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_defectos" ADD CONSTRAINT "inspeccion_defectos_tipo_defecto_id_fkey" FOREIGN KEY ("tipo_defecto_id") REFERENCES "tipos_defecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
