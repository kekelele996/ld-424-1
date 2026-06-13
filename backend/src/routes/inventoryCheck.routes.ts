import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../models/auditLog.entity';
import { Consumable } from '../models/consumable.entity';
import { InventoryCheck } from '../models/inventoryCheck.entity';
import { InventoryCheckItem } from '../models/inventoryCheckItem.entity';
import { InventoryLog } from '../models/inventoryLog.entity';
import { Reagent } from '../models/reagent.entity';
import { InventoryCheckController } from '../controllers/inventoryCheck.controller';
import { AlertService } from '../services/alert.service';
import { AuditService } from '../services/audit.service';
import { ConsumableService } from '../services/consumable.service';
import { InventoryCheckService } from '../services/inventoryCheck.service';
import { InventoryLogService } from '../services/inventoryLog.service';
import { ReagentService } from '../services/reagent.service';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryCheck, InventoryCheckItem, AuditLog, Reagent, Consumable, InventoryLog])],
  controllers: [InventoryCheckController],
  providers: [InventoryCheckService, AuditService, ReagentService, ConsumableService, AlertService, InventoryLogService],
})
export class InventoryCheckRoutesModule {}
