import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Audit Trail (21 CFR Part 11)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Query immutable laboratory audit logs with filters' })
  findAll(
    @Query('entityName') entityName?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findAll({ entityName, action, limit });
  }

  @Get(':entityName/:entityId')
  @ApiOperation({ summary: 'Get complete audit history for a specific entity' })
  getByEntity(
    @Param('entityName') entityName: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getByEntity(entityName, entityId);
  }
}
