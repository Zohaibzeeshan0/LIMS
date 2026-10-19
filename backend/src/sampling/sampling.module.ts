import { Module } from '@nestjs/common';
import { SamplingService } from './sampling.service';
import { SamplingController } from './sampling.controller';

@Module({
  controllers: [SamplingController],
  providers: [SamplingService],
  exports: [SamplingService],
})
export class SamplingModule {}
