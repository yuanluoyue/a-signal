import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '用户昵称' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nickname?: string;

  @ApiPropertyOptional({ description: '头像种子' })
  @IsOptional()
  @IsString()
  avatarSeed?: string;
}
