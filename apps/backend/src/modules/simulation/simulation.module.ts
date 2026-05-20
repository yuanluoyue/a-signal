import { Module } from '@nestjs/common';
import { SimulationService } from './simulation.service.js';
import { DbModule } from '../../core/db/db.module.js';
import { KlinesModule } from '../../modules/klines/klines.module.js';

@Module({
  imports: [DbModule, KlinesModule],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}
