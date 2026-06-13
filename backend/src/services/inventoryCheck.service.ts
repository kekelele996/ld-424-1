import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryCheck } from '../models/inventoryCheck.entity';
import { InventoryCheckItem } from '../models/inventoryCheckItem.entity';
import { InventoryCheckStatus, ItemType } from '../types/enums';
import { AuthUser } from '../types/interfaces';
import { AuditService } from './audit.service';
import { ReagentService } from './reagent.service';
import { ConsumableService } from './consumable.service';

@Injectable()
export class InventoryCheckService {
  constructor(
    @InjectRepository(InventoryCheck) private readonly repo: Repository<InventoryCheck>,
    @InjectRepository(InventoryCheckItem) private readonly itemRepo: Repository<InventoryCheckItem>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly reagents: ReagentService,
    private readonly consumables: ConsumableService,
  ) {}

  list() {
    return this.repo.find({ relations: ['items'], order: { checkDate: 'DESC' } });
  }

  async create(payload: Partial<InventoryCheck> & { items?: Partial<InventoryCheckItem>[] }, user: AuthUser) {
    return this.dataSource.transaction(async (em) => {
      const check = await em.save(em.create(InventoryCheck, { ...payload, checkerId: payload.checkerId ?? user.id }));
      const items = await em.save((payload.items ?? []).map((item) => em.create(InventoryCheckItem, { ...item, inventoryCheck: check })));
      const hasDiscrepancy = items.some((item) => Number(item.difference) !== 0);
      check.items = items;
      check.status = hasDiscrepancy ? InventoryCheckStatus.Discrepancy : payload.status ?? InventoryCheckStatus.Completed;
      const saved = await em.save(check);
      for (const item of items) {
        if (Number(item.difference) !== 0) {
          const action = item.itemType === ItemType.Reagent ? 'INVENTORY_CHECK_REAGENT' : 'INVENTORY_CHECK_CONSUMABLE';
          const reason = item.reason ?? `盘点差异调整：系统库存${item.systemStock}，实际库存${item.actualStock}`;
          if (item.itemType === ItemType.Reagent) {
            await this.reagents.adjustStock(item.itemId, Number(item.difference), user, action, reason, saved.id, em);
          } else {
            await this.consumables.adjustStock(item.itemId, Number(item.difference), user, action, reason, saved.id, em);
          }
        }
      }
      await this.audit.record(user, 'CREATE_INVENTORY_CHECK', 'inventoryCheck', { id: saved.id, status: saved.status }, em);
      return saved;
    });
  }
}
