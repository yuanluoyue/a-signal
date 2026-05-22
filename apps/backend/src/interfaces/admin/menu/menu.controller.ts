import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MenuService } from '../../../modules/menu/menu.service.js';
import { UsersService } from '../../../modules/users/users.service.js';
import { AuditLogService } from '../../../modules/audit-log/audit-log.service.js';
import { CreateMenuDto, UpdateMenuDto, UpdateSortDto } from './dto/index.js';

@ApiTags('菜单管理')
@Controller('menus')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有菜单' })
  async findAll() {
    return this.menuService.findAll();
  }

  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前角色可见菜单' })
  async getMyMenus(@Request() req: { user?: { sub: string } }) {
    const userId = req.user?.sub;
    if (!userId) {
      return this.menuService.getMenusByRole('normal');
    }
    const user = await this.usersService.findById(userId);
    const role = user?.role || 'normal';
    return this.menuService.getMenusByRole(role);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建菜单' })
  async create(@Body() dto: CreateMenuDto, @Request() req: { user?: { sub: string } }) {
    const menu = await this.menuService.create(dto);

    await this.auditLogService.log({
      userId: req.user?.sub,
      action: 'menu.create',
      resource: 'menu',
      resourceId: menu.id,
      detail: { name: dto.name, path: dto.path, visibleRoles: dto.visibleRoles },
      status: 'success',
    });

    return menu;
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新菜单' })
  async update(@Param('id') id: string, @Body() dto: UpdateMenuDto, @Request() req: { user?: { sub: string } }) {
    const menu = await this.menuService.update(id, dto);

    await this.auditLogService.log({
      userId: req.user?.sub,
      action: 'menu.update',
      resource: 'menu',
      resourceId: id,
      detail: { name: dto.name, path: dto.path, visibleRoles: dto.visibleRoles, status: dto.status },
      status: 'success',
    });

    return menu;
  }

  @Put(':id/sort')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新菜单排序' })
  async updateSort(@Param('id') id: string, @Body() dto: UpdateSortDto, @Request() req: { user?: { sub: string } }) {
    const menu = await this.menuService.updateSort(id, dto.sort);

    await this.auditLogService.log({
      userId: req.user?.sub,
      action: 'menu.update_sort',
      resource: 'menu',
      resourceId: id,
      detail: { sort: dto.sort },
      status: 'success',
    });

    return menu;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除菜单（软删除）' })
  async remove(@Param('id') id: string, @Request() req: { user?: { sub: string } }) {
    const menu = await this.menuService.softDelete(id);

    await this.auditLogService.log({
      userId: req.user?.sub,
      action: 'menu.delete',
      resource: 'menu',
      resourceId: id,
      detail: { name: menu.name },
      status: 'success',
    });

    return menu;
  }
}
