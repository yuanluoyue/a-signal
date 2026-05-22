import { IsString, IsOptional, IsNumber, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuDto {
  @ApiPropertyOptional({ description: '父菜单ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ description: '菜单名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '路由路径' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: '图标名称' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '排序权重', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sort?: number;

  @ApiPropertyOptional({ description: '可见角色列表', default: ['admin', 'normal'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibleRoles?: string[];
}
