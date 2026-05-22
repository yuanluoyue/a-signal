import {
  Controller,
  Get,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InviteCodeService } from '../../../modules/invite-code/invite-code.service.js';
import { GenerateInviteCodeDto, QueryInviteCodesDto } from './dto/index.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

@ApiTags('邀请码')
@Controller('invite-codes')
export class InviteCodeController {
  constructor(private readonly inviteCodeService: InviteCodeService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成邀请码' })
  async generate(
    @Body() dto: GenerateInviteCodeDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.inviteCodeService.generate({
      createdById: userId,
      expiresInHours: dto.expiresInHours,
    });
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户创建的邀请码列表' })
  async findAll(
    @Query() dto: QueryInviteCodesDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.inviteCodeService.findAll({
      createdById: userId,
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
    });
  }
}
