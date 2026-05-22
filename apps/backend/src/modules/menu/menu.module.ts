import { Module } from '@nestjs/common';
import { MenuService } from './menu.service.js';

@Module({
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
