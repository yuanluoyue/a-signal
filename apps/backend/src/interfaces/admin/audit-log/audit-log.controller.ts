import { Controller, Get, Query, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditLogService } from '../../../modules/audit-log/audit-log.service.js';
import { QueryAuditLogDto } from './dto/index.js';

@ApiTags('审计日志')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询当前用户审计日志' })
  async findAll(
    @Request() req: { user?: { sub: string } },
    @Query() dto: QueryAuditLogDto,
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new BadRequestException('无法获取用户ID');
    }
    const result = await this.auditLogService.findByUserId(userId, {
      action: dto.action,
      resource: dto.resource,
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
    });
    return result;
  }
}
