import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../models/auditLog.entity';
import { InventoryLog } from '../models/inventoryLog.entity';
import { Reagent } from '../models/reagent.entity';
import { ReagentController } from '../controllers/reagent.controller';
import { AuditService } from '../services/audit.service';
import { AlertService } from '../services/alert.service';
import { InventoryLogService } from '../services/inventoryLog.service';
import { ReagentService } from '../services/reagent.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reagent, AuditLog, InventoryLog])],
  controllers: [ReagentController],
  providers: [ReagentService, AuditService, AlertService, InventoryLogService],
  exports: [ReagentService],
})
export class ReagentRoutesModule {}
