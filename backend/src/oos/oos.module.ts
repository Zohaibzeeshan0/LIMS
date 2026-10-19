import { Module } from '@nestjs/common';
import { OosService } from './oos.service';
import { OosController } from './oos.controller';

@Module({
  controllers: [OosController],
  providers: [OosService],
  exports: [OosService],
})
export class OosModule {}
