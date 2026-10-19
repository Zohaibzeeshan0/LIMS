import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('21 CFR Part 11 Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Query immutable laboratory audit logs with entity, action and limit filters' })
  findAll(
    @Query('entityName') entityName?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditLogsService.findAll({ entityName, action, limit });
  }

  @Get(':entityName/:entityId')
  @ApiOperation({ summary: 'Get complete audit history for a specific entity' })
  findByEntity(
    @Param('entityName') entityName: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLogsService.findByEntity(entityName, entityId);
  }
}
