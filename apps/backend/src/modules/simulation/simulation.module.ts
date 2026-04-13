import { Module } from '@nestjs/common';
import { SimulationService } from './simulation.service.js';
import { DbModule } from '../../core/db/db.module.js';

@Module({
  imports: [DbModule],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}
