import { createApp } from './app';
import { ENV } from './config/env';
import { prisma } from './config/prisma';

async function bootstrap() {
  const app = createApp();

  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ PostgreSQL database connection established successfully.');
  } catch (err: any) {
    console.error('❌ Failed to connect to PostgreSQL database:', err.message);
  }

  const server = app.listen(ENV.PORT, () => {
    console.log(`🚀 City Pharma LIMS API (Node.js + Express) listening on port ${ENV.PORT}`);
    console.log(`🔗 API Base: http://localhost:${ENV.PORT}/api/v1`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Closing HTTP server and database connections...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Server and database gracefully closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal error during server bootstrap:', err);
  process.exit(1);
});
