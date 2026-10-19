import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InstrumentsService } from './instruments.service';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { LogCalibrationDto } from './dto/log-calibration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, Role } from '../auth/roles.decorator';

@ApiTags('Instruments & Calibration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all laboratory instruments with calibration health status' })
  findAll() {
    return this.instrumentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get instrument details with calibration logs and recent tests' })
  findOne(@Param('id') id: string) {
    return this.instrumentsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.LAB_TECHNICIAN)
  @ApiOperation({ summary: 'Register a new analytical instrument in the laboratory directory' })
  create(@Body() dto: CreateInstrumentDto, @Request() req: any) {
    return this.instrumentsService.create(dto, req.user);
  }

  @Post(':id/calibration')
  @Roles(Role.ADMIN, Role.QA_MANAGER, Role.LAB_TECHNICIAN, Role.QC_ANALYST)
  @ApiOperation({ summary: 'Log a new calibration event with certificate and due date recalculation' })
  logCalibration(
    @Param('id') id: string,
    @Body() dto: LogCalibrationDto,
    @Request() req: any,
  ) {
    return this.instrumentsService.logCalibration(id, dto, req.user);
  }
}
