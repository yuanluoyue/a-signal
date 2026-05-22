import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, asc } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DbService } from '../../core/db/db.service.js';
import * as schema from '../../core/db/schema.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';

export interface GenerateInviteCodeInput {
  createdById: string;
  expiresInHours?: number;
}

@Injectable()
export class InviteCodeService {
  private readonly logger = new Logger(InviteCodeService.name);

  constructor(
    private dbService: DbService,
    private auditLogService: AuditLogService,
  ) {}

  private generateCode(): string {
    return randomBytes(8).toString('hex');
  }

  async generate(input: GenerateInviteCodeInput): Promise<schema.InviteCode> {
    const expiresInHours = input.expiresInHours || 72;
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const result = await this.dbService.db
      .insert(schema.inviteCodes)
      .values({
        code,
        createdById: input.createdById,
        expiresAt,
      })
      .returning();

    this.logger.log(`Invite code generated: ${code}, expires at ${expiresAt.toISOString()}`);

    await this.auditLogService.log({
      userId: input.createdById,
      action: 'invite_code.generate',
      resource: 'invite_code',
      resourceId: result[0].id,
      detail: { code, expiresInHours, expiresAt: expiresAt.toISOString() },
      status: 'success',
    });

    return result[0];
  }

  async validate(code: string): Promise<schema.InviteCode> {
    const result = await this.dbService.db
      .select()
      .from(schema.inviteCodes)
      .where(
        and(
          eq(schema.inviteCodes.code, code),
          eq(schema.inviteCodes.status, 'active'),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      throw new BadRequestException('邀请码无效');
    }

    const inviteCode = result[0];

    if (inviteCode.expiresAt < new Date()) {
      await this.dbService.db
        .update(schema.inviteCodes)
        .set({ status: 'expired' })
        .where(eq(schema.inviteCodes.id, inviteCode.id));

      throw new BadRequestException('邀请码已过期');
    }

    if (inviteCode.usedBy) {
      throw new BadRequestException('邀请码已被使用');
    }

    return inviteCode;
  }

  async markUsed(code: string, usedByUserId: string): Promise<void> {
    const result = await this.dbService.db
      .select()
      .from(schema.inviteCodes)
      .where(eq(schema.inviteCodes.code, code))
      .limit(1);

    if (result.length === 0) return;

    const inviteCode = result[0];

    await this.dbService.db
      .update(schema.inviteCodes)
      .set({
        usedBy: usedByUserId,
        usedAt: new Date(),
        status: 'used',
      })
      .where(eq(schema.inviteCodes.id, inviteCode.id));

    this.logger.log(`Invite code used: ${code} by user ${usedByUserId}`);

    await this.auditLogService.log({
      userId: usedByUserId,
      action: 'invite_code.use',
      resource: 'invite_code',
      resourceId: inviteCode.id,
      detail: { code },
      status: 'success',
    });
  }

  async findAll(params: { createdById: string; page: number; pageSize: number }): Promise<{ data: any[]; total: number }> {
    const conditions = [eq(schema.inviteCodes.createdById, params.createdById)];

    const whereClause = and(...conditions);

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.inviteCodes)
      .where(whereClause);

    const data = await this.dbService.db
      .select({
        id: schema.inviteCodes.id,
        code: schema.inviteCodes.code,
        createdById: schema.inviteCodes.createdById,
        usedBy: schema.inviteCodes.usedBy,
        expiresAt: schema.inviteCodes.expiresAt,
        usedAt: schema.inviteCodes.usedAt,
        status: schema.inviteCodes.status,
        createdAt: schema.inviteCodes.createdAt,
        usedByNickname: schema.users.nickname,
        usedByEmail: schema.users.email,
      })
      .from(schema.inviteCodes)
      .leftJoin(schema.users, eq(schema.inviteCodes.usedBy, schema.users.id))
      .where(whereClause)
      .orderBy(desc(schema.inviteCodes.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    return { data, total: count };
  }

  async isSystemEmpty(): Promise<boolean> {
    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.users);
    return count === 0;
  }
}
