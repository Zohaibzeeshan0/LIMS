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
import { OosService } from './oos.service';
import { CreateOosDto } from './dto/create-oos.dto';
import { UpdateOosDto } from './dto/update-oos.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, Role } from '../auth/roles.decorator';

@ApiTags('OOS & CAPA Investigations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('oos')
export class OosController {
  constructor(private readonly oosService: OosService) {}

  @Get()
  @ApiOperation({ summary: 'List all Out-of-Specification incidents and active CAPAs' })
  findAll() {
    return this.oosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full OOS investigation report with testing and lab history' })
  findOne(@Param('id') id: string) {
    return this.oosService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST)
  @ApiOperation({ summary: 'Initiate a new formal OOS incident report' })
  create(@Body() dto: CreateOosDto, @Request() req: any) {
    return this.oosService.create(dto, req.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.QC_ANALYST)
  @ApiOperation({ summary: 'Update Phase 1/Phase 2 investigation findings, root cause, or QA sign-off' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOosDto,
    @Request() req: any,
  ) {
    return this.oosService.update(id, dto, req.user);
  }
}
