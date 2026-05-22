import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import * as schema from '../../core/db/schema.js';

export interface CreateMenuInput {
  parentId?: string;
  name: string;
  path?: string;
  icon?: string;
  sort?: number;
  visibleRoles?: string[];
}

export interface UpdateMenuInput {
  parentId?: string;
  name?: string;
  path?: string;
  icon?: string;
  sort?: number;
  visibleRoles?: string[];
  status?: string;
}

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(private dbService: DbService) {}

  async findAll(): Promise<schema.Menu[]> {
    return this.dbService.db
      .select()
      .from(schema.menus)
      .orderBy(asc(schema.menus.sort));
  }

  async getMenusByRole(role: string): Promise<schema.Menu[]> {
    const allMenus = await this.dbService.db
      .select()
      .from(schema.menus)
      .orderBy(asc(schema.menus.sort));

    this.logger.log(`getMenusByRole: role=${role}, total menus in DB=${allMenus.length}`);

    const activeMenus = allMenus.filter(menu => {
      const status = menu.status || 'active';
      return status === 'active';
    });

    this.logger.log(`getMenusByRole: active menus=${activeMenus.length}`);

    const result = activeMenus.filter(menu => {
      const roles = menu.visibleRoles || ['admin', 'normal'];
      const included = roles.includes(role);
      return included;
    });

    this.logger.log(`getMenusByRole: menus for role '${role}'=${result.length}, names=[${result.map(m => m.name).join(',')}]`);

    return result;
  }

  async create(input: CreateMenuInput): Promise<schema.Menu> {
    this.logger.log(`Creating menu: ${input.name}`);
    const result = await this.dbService.db
      .insert(schema.menus)
      .values({
        parentId: input.parentId || null,
        name: input.name,
        path: input.path || null,
        icon: input.icon || null,
        sort: input.sort ?? 0,
        visibleRoles: input.visibleRoles || ['admin', 'normal'],
      })
      .returning();
    return result[0];
  }

  async update(id: string, input: UpdateMenuInput): Promise<schema.Menu> {
    const existing = await this.dbService.db
      .select()
      .from(schema.menus)
      .where(eq(schema.menus.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('Menu not found');
    }

    const updateData: Record<string, unknown> = {};
    if (input.parentId !== undefined) updateData.parentId = input.parentId || null;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.path !== undefined) updateData.path = input.path || null;
    if (input.icon !== undefined) updateData.icon = input.icon || null;
    if (input.sort !== undefined) updateData.sort = input.sort;
    if (input.visibleRoles !== undefined) updateData.visibleRoles = input.visibleRoles;
    if (input.status !== undefined) updateData.status = input.status;

    const result = await this.dbService.db
      .update(schema.menus)
      .set(updateData)
      .where(eq(schema.menus.id, id))
      .returning();

    this.logger.log(`Updated menu: ${id}`);
    return result[0];
  }

  async softDelete(id: string): Promise<schema.Menu> {
    const existing = await this.dbService.db
      .select()
      .from(schema.menus)
      .where(eq(schema.menus.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('Menu not found');
    }

    const result = await this.dbService.db
      .update(schema.menus)
      .set({ status: 'inactive' })
      .where(eq(schema.menus.id, id))
      .returning();

    this.logger.log(`Soft deleted menu: ${id}`);
    return result[0];
  }

  async updateSort(id: string, sort: number): Promise<schema.Menu> {
    const existing = await this.dbService.db
      .select()
      .from(schema.menus)
      .where(eq(schema.menus.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('Menu not found');
    }

    const result = await this.dbService.db
      .update(schema.menus)
      .set({ sort })
      .where(eq(schema.menus.id, id))
      .returning();

    return result[0];
  }
}
