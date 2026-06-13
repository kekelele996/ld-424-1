import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { StockInRecord } from '../models/stockInRecord.entity';
import { ItemType } from '../types/enums';
import { AuthUser } from '../types/interfaces';
import { AuditService } from './audit.service';
import { ConsumableService } from './consumable.service';
import { ReagentService } from './reagent.service';

@Injectable()
export class StockInService {
  constructor(
    @InjectRepository(StockInRecord) private readonly repo: Repository<StockInRecord>,
    private readonly dataSource: DataSource,
    private readonly reagents: ReagentService,
    private readonly consumables: ConsumableService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.repo.find({ order: { stockInDate: 'DESC' } });
  }

  async create(payload: Partial<StockInRecord>, user: AuthUser) {
    return this.dataSource.transaction(async (em) => {
      const record = await em.save(em.create(StockInRecord, payload));
      const reason = `入库：采购单${record.purchaseOrderNo}，批号${record.batchNumber}`;
      if (record.itemType === ItemType.Reagent) {
        await this.reagents.adjustStock(record.itemId, Number(record.quantity), user, 'STOCK_IN_REAGENT', reason, record.id, em);
      } else {
        await this.consumables.adjustStock(record.itemId, Number(record.quantity), user, 'STOCK_IN_CONSUMABLE', reason, record.id, em);
      }
      await this.audit.record(user, 'CREATE_STOCK_IN', 'stockInRecord', { id: record.id, itemType: record.itemType }, em);
      return record;
    });
  }
}
