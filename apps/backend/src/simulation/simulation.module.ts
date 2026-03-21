import { Module } from '@nestjs/common';
import { SimulationService } from './simulation.service.js';
import { SimulationController } from './simulation.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SimulationController],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}
