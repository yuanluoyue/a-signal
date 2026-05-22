import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from '../../../modules/users/users.service.js';
import { AuditLogService } from '../../../modules/audit-log/audit-log.service.js';
import { QueryUsersDto, UpdateRoleDto } from './dto/index.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

@ApiTags('用户管理')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户列表' })
  async findAll(@Query() dto: QueryUsersDto) {
    return this.usersService.findAll({
      keyword: dto.keyword,
      role: dto.role,
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
    });
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户详情' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Put(':id/role')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改用户角色' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('sub') currentUserId: string,
  ) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousRole = user.role || 'normal';
    const updated = await this.usersService.updateRole(id, dto.role);
    const { password, ...userWithoutPassword } = updated!;

    await this.auditLogService.log({
      userId: currentUserId,
      action: 'user.update_role',
      resource: 'user',
      resourceId: id,
      detail: { previousRole, newRole: dto.role, targetUserEmail: user.email },
      status: 'success',
    });

    return userWithoutPassword;
  }
}
