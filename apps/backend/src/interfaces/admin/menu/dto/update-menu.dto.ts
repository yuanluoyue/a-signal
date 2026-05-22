import { IsString, IsOptional, IsNumber, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMenuDto {
  @ApiPropertyOptional({ description: '父菜单ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: '菜单名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '路由路径' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: '图标名称' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sort?: number;

  @ApiPropertyOptional({ description: '可见角色列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibleRoles?: string[];

  @ApiPropertyOptional({ description: '状态', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsString()
  status?: string;
}
