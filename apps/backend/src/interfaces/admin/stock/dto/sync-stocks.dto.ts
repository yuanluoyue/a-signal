import { ApiProperty } from '@nestjs/swagger';

export class SyncStocksDto {
  @ApiProperty({
    description: '是否强制同步（覆盖现有数据）',
    default: false,
    required: false,
  })
  force?: boolean;
}
