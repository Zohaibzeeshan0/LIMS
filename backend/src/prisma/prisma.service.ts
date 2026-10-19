import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to PostgreSQL Database.');
    } catch (error: any) {
      this.logger.error(
        '⚠️ Database se connect nahi ho saka (PostgreSQL localhost:5432 par band hai ya password alag hai). Backend server chal raha hai, lekin database queries ke liye PostgreSQL ko start karna hoga.',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
