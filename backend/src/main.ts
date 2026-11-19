import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { getCorsOptions } from './common/config/cors.config.js';
import { getJwtSecret } from './common/config/jwt.config.js';

async function bootstrap() {
  // Load local environment file if process.loadEnvFile is supported
  if (typeof (process as any).loadEnvFile === 'function') {
    for (const envPath of ['.env', 'backend/.env', '../.env']) {
      try {
        (process as any).loadEnvFile(envPath);
      } catch {}
    }
  }

  // Validate JWT Secret at startup before accepting traffic
  getJwtSecret();

  // Import modules only after local environment loading and signing-key validation.
  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create(AppModule);

  // Configure Trusted Proxy explicitly (Prevent header spoofing and respect reverse proxies)
  const trustedProxies = process.env.TRUSTED_PROXIES;
  const expressApp = app.getHttpAdapter().getInstance();
  if (trustedProxies) {
    if (trustedProxies === 'true') {
      // Never enable unrestricted wildcard trust in production; safely default to loopback
      expressApp.set('trust proxy', 'loopback');
    } else if (!isNaN(Number(trustedProxies))) {
      expressApp.set('trust proxy', Number(trustedProxies));
    } else {
      expressApp.set('trust proxy', trustedProxies);
    }
  } else if (process.env.NODE_ENV !== 'production') {
    // Safe local development default: trust loopback proxies
    expressApp.set('trust proxy', 'loopback');
  } else {
    // Production default when TRUSTED_PROXIES is unset: disabled (fail-safe)
    expressApp.set('trust proxy', false);
  }

  // Modern security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'https:'],
          fontSrc: ["'self'", 'data:', 'https:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: { action: 'sameorigin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xContentTypeOptions: true,
      hsts:
        process.env.NODE_ENV === 'production'
          ? {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: true,
            }
          : false,
    }),
  );

  // Secure, explicit origin allowlist CORS
  app.enableCors(getCorsOptions());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`DocMatrix Backend running on http://localhost:${port}`);
}
await bootstrap();
