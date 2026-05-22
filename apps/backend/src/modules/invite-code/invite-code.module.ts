import { Module } from '@nestjs/common';
import { InviteCodeService } from './invite-code.service.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';

@Module({
  imports: [AuditLogModule],
  providers: [InviteCodeService],
  exports: [InviteCodeService],
})
export class InviteCodeModule {}
