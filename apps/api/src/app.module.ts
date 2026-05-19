import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { ClientesModule } from './clientes/clientes.module';
import { DestinosModule } from './destinos/destinos.module';
import { FundosModule } from './fundos/fundos.module';
import { HealthModule } from './health/health.module';
import { InspeccionesModule } from './inspecciones/inspecciones.module';
import { InspeccionesExportModule } from './inspecciones-export/inspecciones-export.module';
import { InspeccionesResumenModule } from './inspecciones-resumen/inspecciones-resumen.module';
import { InspeccionesStatsModule } from './inspecciones-stats/inspecciones-stats.module';
import { PrismaModule } from './prisma/prisma.module';
import { TiposDefectoModule } from './tipos-defecto/tipos-defecto.module';
import { TiposEmbalajeModule } from './tipos-embalaje/tipos-embalaje.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { VariedadesModule } from './variedades/variedades.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Default global: 30 req/min por IP. Endpoints sensibles redefinen con @Throttle.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 30 }],
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    // Catálogos
    VariedadesModule,
    FundosModule,
    ClientesModule,
    DestinosModule,
    TiposEmbalajeModule,
    TiposDefectoModule,
    UsuariosModule,
    // Core transaccional
    InspeccionesModule,
    InspeccionesResumenModule,
    InspeccionesStatsModule,
    InspeccionesExportModule,
  ],
  providers: [
    // Orden importante: Throttler primero (rebota antes de tocar auth/DB)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
