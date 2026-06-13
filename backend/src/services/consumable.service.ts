import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consumable } from '../models/consumable.entity';
import { AuthUser } from '../types/interfaces';
import { AuditService } from './audit.service';
import { AlertService } from './alert.service';
import { InventoryLogService } from './inventoryLog.service';
import { InventoryChangeType, ItemType } from '../types/enums';

@Injectable()
export class ConsumableService {
  constructor(
    @InjectRepository(Consumable) private readonly repo: Repository<Consumable>,
    private readonly audit: AuditService,
    private readonly alerts: AlertService,
    private readonly inventoryLogs: InventoryLogService,
  ) {}

  list() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async create(payload: Partial<Consumable>, user: AuthUser) {
    const consumable = await this.repo.save(this.repo.create(payload));
    await this.audit.record(user, 'CREATE_CONSUMABLE', 'consumable', { id: consumable.id });
    await this.alerts.cacheLowStockAlert(consumable, 'consumable');
    return consumable;
  }

  async findOne(id: string) {
    const consumable = await this.repo.findOneBy({ id });
    if (!consumable) throw new NotFoundException('耗材不存在');
    return consumable;
  }

  async adjustStock(id: string, delta: number, user: AuthUser, action = 'ADJUST_CONSUMABLE_STOCK', reason?: string, relatedRecordId?: string) {
    const consumable = await this.findOne(id);
    const beforeStock = Number(consumable.currentStock);
    consumable.currentStock = beforeStock + delta;
    const saved = await this.repo.save(consumable);
    await this.audit.record(user, action, 'consumable', { id, delta, currentStock: saved.currentStock });
    await this.alerts.cacheLowStockAlert(saved, 'consumable');
    const changeType = this.resolveChangeType(action);
    await this.inventoryLogs.record({
      itemId: id,
      itemType: ItemType.Consumable,
      changeType,
      quantity: Math.abs(delta),
      beforeStock,
      afterStock: Number(saved.currentStock),
      reason: reason ?? action,
      operatorId: user.id,
      relatedRecordId,
    });
    return saved;
  }

  private resolveChangeType(action: string): InventoryChangeType {
    if (action.startsWith('STOCK_IN')) return InventoryChangeType.StockIn;
    if (action.startsWith('APPROVE')) return InventoryChangeType.UsageApproval;
    if (action.startsWith('USE')) return InventoryChangeType.Usage;
    if (action.startsWith('INVENTORY_CHECK')) return InventoryChangeType.InventoryCheckAdjust;
    return InventoryChangeType.StockIn;
  }
}
