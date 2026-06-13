import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryLog } from '../models/inventoryLog.entity';
import { InventoryLogController } from '../controllers/inventoryLog.controller';
import { InventoryLogService } from '../services/inventoryLog.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryLog])],
  controllers: [InventoryLogController],
  providers: [InventoryLogService],
  exports: [InventoryLogService],
})
export class InventoryLogRoutesModule {}
