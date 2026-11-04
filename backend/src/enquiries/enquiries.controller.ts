import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EnquiriesService } from './enquiries.service.js';
import { CreateEnquiryDto } from './dto/create-enquiry.dto.js';
import { UpdateEnquiryDto } from './dto/update-enquiry.dto.js';
import { EnquiryQueryDto } from './dto/enquiry-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('enquiries')
export class EnquiriesController {
  constructor(private enquiriesService: EnquiriesService) {}

  @Get()
  async getAllEnquiries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: EnquiryQueryDto,
  ) {
    return this.enquiriesService.getAllEnquiries(user.clinicId!, query);
  }

  @Get(':id')
  async getEnquiry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.enquiriesService.getEnquiryById(user.clinicId!, id);
  }

  @Post()
  async createEnquiry(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEnquiryDto,
  ) {
    return this.enquiriesService.createEnquiry(user.clinicId!, dto);
  }

  @Patch(':id')
  async updateEnquiry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEnquiryDto,
  ) {
    return this.enquiriesService.updateEnquiry(user.clinicId!, id, dto);
  }

  @Delete(':id')
  async deleteEnquiry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.enquiriesService.deleteEnquiry(user.clinicId!, id);
  }
}
