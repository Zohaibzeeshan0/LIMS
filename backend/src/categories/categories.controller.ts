import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateSpecificationDto } from './dto/create-specification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Test Monograph Categories & Specifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all master test specifications & monographs' })
  findAll(@Query('category') category?: any) {
    if (category) {
      return this.categoriesService.findByCategory(category);
    }
    return this.categoriesService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN, Role.QA_MANAGER)
  @ApiOperation({ summary: 'Create a new test monograph / compendial specification' })
  create(@Body() dto: CreateSpecificationDto, @Request() req: any) {
    return this.categoriesService.create(dto, req.user);
  }
}
