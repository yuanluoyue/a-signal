import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StockService } from '../../../modules/stock/stock.service.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { SyncStocksDto, SearchStocksDto } from './dto/index.js';

@ApiTags('股票管理')
@Controller('stock')
@ApiBearerAuth()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('sync')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '同步股票信息' })
  @ApiResponse({
    status: 200,
    description: '成功同步股票信息',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            added: { type: 'number', description: '新增数量' },
            updated: { type: 'number', description: '更新数量' },
          },
        },
      },
    },
  })
  async syncStocks(@Body() _dto: SyncStocksDto) {
    const result = await this.stockService.syncFromCninfo();
    return { data: result };
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: '搜索股票' })
  @ApiResponse({
    status: 200,
    description: '成功获取股票列表',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string', description: '股票代码' },
              name: { type: 'string', description: '股票名称' },
            },
          },
        },
      },
    },
  })
  async searchStocks(@Query() query: SearchStocksDto) {
    const stocks = await this.stockService.searchStocks(query.keyword);
    return { data: stocks };
  }
}
