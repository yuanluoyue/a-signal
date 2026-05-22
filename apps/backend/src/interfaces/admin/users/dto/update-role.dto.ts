import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({ description: '角色', enum: ['admin', 'normal'] })
  @IsString()
  @IsIn(['admin', 'normal'])
  role: string;
}
