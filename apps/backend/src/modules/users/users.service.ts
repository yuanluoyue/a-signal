import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql, like } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service.js';
import * as schema from '../../core/db/schema.js';

export interface CreateUserInput {
  nickname: string;
  email: string;
  password: string;
  avatarSeed?: string;
}

export interface UpdateUserInput {
  nickname?: string;
  avatarSeed?: string;
}

export interface UpdatePasswordInput {
  password: string;
}

export interface UserQueryParams {
  keyword?: string;
  role?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private dbService: DbService) {}

  async findById(id: string): Promise<schema.User | null> {
    const result = await this.dbService.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findByEmail(email: string): Promise<schema.User | null> {
    const result = await this.dbService.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return result[0] || null;
  }

  async create(input: CreateUserInput): Promise<schema.User> {
    const result = await this.dbService.db
      .insert(schema.users)
      .values({
        nickname: input.nickname,
        email: input.email,
        password: input.password,
        avatarSeed: input.avatarSeed,
      })
      .returning();
    return result[0];
  }

  async update(id: string, input: UpdateUserInput): Promise<schema.User | null> {
    const result = await this.dbService.db
      .update(schema.users)
      .set({
        nickname: input.nickname,
        avatarSeed: input.avatarSeed,
      })
      .where(eq(schema.users.id, id))
      .returning();
    return result[0] || null;
  }

  async updatePassword(
    id: string,
    input: UpdatePasswordInput,
  ): Promise<schema.User | null> {
    const result = await this.dbService.db
      .update(schema.users)
      .set({
        password: input.password,
      })
      .where(eq(schema.users.id, id))
      .returning();
    return result[0] || null;
  }

  async findAll(params: UserQueryParams): Promise<{ data: Omit<schema.User, 'password'>[]; total: number }> {
    const conditions = [];

    if (params.keyword) {
      conditions.push(
        like(schema.users.nickname, `%${params.keyword}%`),
      );
    }

    if (params.role) {
      conditions.push(eq(schema.users.role, params.role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(whereClause);

    const rows = await this.dbService.db
      .select({
        id: schema.users.id,
        nickname: schema.users.nickname,
        email: schema.users.email,
        avatarSeed: schema.users.avatarSeed,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
      })
      .from(schema.users)
      .where(whereClause)
      .orderBy(desc(schema.users.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    return { data: rows, total: count };
  }

  async updateRole(id: string, role: string): Promise<schema.User | null> {
    this.logger.log(`Updating user ${id} role to ${role}`);
    const result = await this.dbService.db
      .update(schema.users)
      .set({ role })
      .where(eq(schema.users.id, id))
      .returning();
    return result[0] || null;
  }
}
