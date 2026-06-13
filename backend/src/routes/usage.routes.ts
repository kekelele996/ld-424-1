import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../models/auditLog.entity';
import { Consumable } from '../models/consumable.entity';
import { InventoryLog } from '../models/inventoryLog.entity';
import { Reagent } from '../models/reagent.entity';
import { UsageRecord } from '../models/usageRecord.entity';
import { UsageController } from '../controllers/usage.controller';
import { AuditService } from '../services/audit.service';
import { AlertService } from '../services/alert.service';
import { ConsumableService } from '../services/consumable.service';
import { InventoryLogService } from '../services/inventoryLog.service';
import { ReagentService } from '../services/reagent.service';
import { UsageService } from '../services/usage.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsageRecord, Reagent, Consumable, AuditLog, InventoryLog])],
  controllers: [UsageController],
  providers: [UsageService, ReagentService, ConsumableService, AuditService, AlertService, InventoryLogService],
})
export class UsageRoutesModule {}
