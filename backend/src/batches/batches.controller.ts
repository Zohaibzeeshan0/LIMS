import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { IssueCoaDto } from './dto/create-coa.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, Role } from '../auth/roles.decorator';

@ApiTags('Batches & Certificate of Analysis (CoA)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  @ApiOperation({ summary: 'List all pharmaceutical batches with QA status and CoA state' })
  findAll() {
    return this.batchesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get batch details with all linked samples and testing results' })
  findOne(@Param('id') id: string) {
    return this.batchesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST)
  @ApiOperation({ summary: 'Create a new pharmaceutical production batch / lot' })
  create(@Body() dto: CreateBatchDto, @Request() req: any) {
    return this.batchesService.create(dto, req.user);
  }

  @Patch(':id/release')
  @Roles(Role.ADMIN, Role.QA_MANAGER)
  @ApiOperation({ summary: 'QA Manager decision: RELEASE or REJECT batch' })
  releaseBatch(
    @Param('id') id: string,
    @Body() body: { decision: 'RELEASED' | 'REJECTED'; notes: string },
    @Request() req: any,
  ) {
    return this.batchesService.releaseBatch(id, body.decision, body.notes, req.user);
  }

  @Post('coa')
  @Roles(Role.ADMIN, Role.QA_MANAGER)
  @ApiOperation({ summary: 'Generate and issue official Certificate of Analysis (CoA) with digital seal' })
  issueCoa(@Body() dto: IssueCoaDto, @Request() req: any) {
    return this.batchesService.issueCoa(dto, req.user);
  }
}
