import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Helmet con CORP relajado: el frontend Next (puerto 3000) consume esta API
  // desde el navegador (puerto 3001). El default `same-origin` bloquea ese fetch.
  // En prod, si front y back salen detrás del mismo dominio, podés volver al default.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // PORT en local viene del .env (4000); en Railway lo inyecta la plataforma.
  // Bindea a 0.0.0.0 para que el container de Railway lo exponga correctamente.
  const port = config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`[api] listening on http://localhost:${port}/api`);
}

bootstrap();
