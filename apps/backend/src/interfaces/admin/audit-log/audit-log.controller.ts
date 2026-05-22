import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditLogService } from '../../../modules/audit-log/audit-log.service.js';
import { QueryAuditLogDto } from './dto/index.js';

@ApiTags('审计日志')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询审计日志' })
  async findAll(@Query() dto: QueryAuditLogDto) {
    return this.auditLogService.findAll({
      action: dto.action,
      resource: dto.resource,
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
    });
  }
}
