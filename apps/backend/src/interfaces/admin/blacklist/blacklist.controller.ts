import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BlacklistService } from '../../../modules/blacklist/blacklist.service.js';
import { CreateBlacklistDto } from './dto/index.js';
import { stockBlacklist } from '../../../core/db/schema.js';

@ApiTags('Blacklist')
@Controller('blacklist')
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Get()
  @ApiOperation({ summary: '获取黑名单列表' })
  @ApiResponse({ status: 200, description: '成功获取黑名单列表' })
  async findAll() {
    const data = await this.blacklistService.findAll();
    return { data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '添加股票到黑名单' })
  @ApiResponse({ status: 201, description: '成功添加' })
  @ApiResponse({ status: 400, description: '股票已在黑名单中' })
  async create(@Body() dto: CreateBlacklistDto) {
    const data = await this.blacklistService.create(dto);
    return { data, message: '添加成功' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '从黑名单移除' })
  @ApiResponse({ status: 204, description: '成功移除' })
  async remove(@Param('id') id: string) {
    await this.blacklistService.remove(id);
  }
}
