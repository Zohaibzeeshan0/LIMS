import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { RecordResultDto } from './dto/record-result.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

import { UpdateSubmissionStatusDto } from './dto/update-submission-status.dto';

@ApiTags('Submissions, Worksheets, Batches & OOS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Patch(':submissionId/status')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST)
  @ApiOperation({ summary: 'Update workflow submission status with 21 CFR Part 11 audit logging' })
  @ApiResponse({ status: 200, description: 'Submission status updated successfully' })
  updateSubmissionStatus(
    @Param('submissionId') submissionId: string,
    @Body() dto: UpdateSubmissionStatusDto,
    @Request() req: any,
  ) {
    return this.submissionsService.updateSubmissionStatus(submissionId, dto, req.user);
  }

  // Worksheets & Tests
  @Get('worksheets')
  @ApiOperation({ summary: 'List all analytical test worksheets' })
  findAllTests() {
    return this.submissionsService.findAllTests();
  }

  @Patch('worksheets/:id/record-result')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST)
  @ApiOperation({ summary: 'Record test result with automatic Out-of-Specification calculation' })
  recordResult(@Param('id') id: string, @Body() dto: RecordResultDto, @Request() req: any) {
    return this.submissionsService.recordResult(id, dto, req.user);
  }

  @Patch('worksheets/:id/verify')
  @Roles(Role.ADMIN, Role.QA_MANAGER)
  @ApiOperation({ summary: 'QA verification and digital sign-off of analytical test' })
  verifyTest(@Param('id') id: string, @Request() req: any) {
    return this.submissionsService.verifyTest(id, req.user);
  }

  // Batches
  @Get('batches')
  @ApiOperation({ summary: 'List all production lots & batches with QA status' })
  findAllBatches() {
    return this.submissionsService.findAllBatches();
  }

  @Post('batches')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST)
  @ApiOperation({ summary: 'Create a new production batch' })
  createBatch(@Body() dto: CreateBatchDto, @Request() req: any) {
    return this.submissionsService.createBatch(dto, req.user);
  }

  @Patch('batches/:id/release')
  @Roles(Role.ADMIN, Role.QA_MANAGER)
  @ApiOperation({ summary: 'QA disposition: RELEASE or REJECT production batch' })
  releaseBatch(
    @Param('id') id: string,
    @Body() body: { decision: 'RELEASED' | 'REJECTED'; notes: string },
    @Request() req: any,
  ) {
    return this.submissionsService.releaseBatch(id, body.decision, body.notes, req.user);
  }

  @Post('batches/:id/coa')
  @Roles(Role.ADMIN, Role.QA_MANAGER)
  @ApiOperation({ summary: 'Generate and issue official Certificate of Analysis (CoA)' })
  issueCoa(@Param('id') id: string, @Request() req: any) {
    return this.submissionsService.issueCoa(id, req.user);
  }

  // OOS Deviations
  @Get('oos')
  @ApiOperation({ summary: 'List all Out-of-Specification incidents' })
  findAllOos() {
    return this.submissionsService.findAllOos();
  }

  @Patch('oos/:id')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST)
  @ApiOperation({ summary: 'Update Phase 1/2 OOS investigation & CAPA' })
  updateOos(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.submissionsService.updateOos(id, dto, req.user);
  }

  // Executive Dashboard Analytics
  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Get executive laboratory KPIs, queues, and trends' })
  getDashboard() {
    return this.submissionsService.getDashboardSummary();
  }
}
