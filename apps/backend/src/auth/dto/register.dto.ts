import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: '用户昵称' })
  @IsString()
  @MinLength(2)
  nickname: string;

  @ApiProperty({ description: '邮箱地址' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '密码', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: '头像种子' })
  @IsOptional()
  @IsString()
  avatarSeed?: string;
}
