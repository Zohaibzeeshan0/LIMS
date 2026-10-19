import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('CityPharmaLIMS');
  const app = await NestFactory.create(AppModule);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const port = process.env.PORT || 3001;

  // Strict & Secure CORS configuration
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global API Prefix (/api/v1)
  app.setGlobalPrefix('api/v1');

  // Global Filter for Exception Formatting & Logging
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // OpenAPI Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('City Pharma LIMS — REST API')
    .setDescription(
      'Pharmaceutical Laboratory Information Management System API compliant with cGMP and 21 CFR Part 11 requirements. Architecture features Auth, Users, Sampling, Laboratories, Categories, Submissions, and Audit-Logs.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token to access authorized endpoints',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const swaggerOptions = {
    customSiteTitle: 'City Pharma LIMS — API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  };
  SwaggerModule.setup('api/docs', app, document, swaggerOptions);
  SwaggerModule.setup('api/v1/docs', app, document, swaggerOptions);

  await app.listen(port);
  logger.log(`=======================================================`);
  logger.log(` City Pharma LIMS Backend running on http://localhost:${port}`);
  logger.log(` API Base URL: http://localhost:${port}/api/v1`);
  logger.log(` Swagger Docs available at http://localhost:${port}/api/v1/docs`);
  logger.log(` Configured CORS for frontend: ${frontendUrl}`);
  logger.log(`=======================================================`);
}

bootstrap();
