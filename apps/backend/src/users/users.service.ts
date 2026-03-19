import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_PROVIDER } from '../database/database.constants.js';
import * as schema from '../database/schema.js';

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

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async findById(id: string): Promise<schema.User | null> {
    const result = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findByEmail(email: string): Promise<schema.User | null> {
    const result = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return result[0] || null;
  }

  async create(input: CreateUserInput): Promise<schema.User> {
    const result = await this.db
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
    const result = await this.db
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
    const result = await this.db
      .update(schema.users)
      .set({
        password: input.password,
      })
      .where(eq(schema.users.id, id))
      .returning();
    return result[0] || null;
  }
}
