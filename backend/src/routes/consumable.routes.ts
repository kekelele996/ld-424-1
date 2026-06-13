import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../models/auditLog.entity';
import { Consumable } from '../models/consumable.entity';
import { InventoryLog } from '../models/inventoryLog.entity';
import { ConsumableController } from '../controllers/consumable.controller';
import { AuditService } from '../services/audit.service';
import { AlertService } from '../services/alert.service';
import { ConsumableService } from '../services/consumable.service';
import { InventoryLogService } from '../services/inventoryLog.service';

@Module({
  imports: [TypeOrmModule.forFeature([Consumable, AuditLog, InventoryLog])],
  controllers: [ConsumableController],
  providers: [ConsumableService, AuditService, AlertService, InventoryLogService],
  exports: [ConsumableService],
})
export class ConsumableRoutesModule { }
