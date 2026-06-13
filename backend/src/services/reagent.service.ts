import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Reagent } from '../models/reagent.entity';
import { AuthUser } from '../types/interfaces';
import { AuditService } from './audit.service';
import { AlertService } from './alert.service';
import { InventoryLogService } from './inventoryLog.service';
import { InventoryChangeType, ItemType } from '../types/enums';

@Injectable()
export class ReagentService {
  constructor(
    @InjectRepository(Reagent) private readonly repo: Repository<Reagent>,
    private readonly audit: AuditService,
    private readonly alerts: AlertService,
    private readonly inventoryLogs: InventoryLogService,
  ) { }

  list() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async create(payload: Partial<Reagent> & Record<string, unknown>, user: AuthUser) {
    const normalized: Partial<Reagent> = {
      ...payload,
      casNumber: String(payload.casNumber ?? payload.cas ?? ''),
      molecularFormula: String(payload.molecularFormula ?? payload.formula ?? ''),
      molecularWeight: Number(payload.molecularWeight ?? 0),
      purityGrade: String(payload.purityGrade ?? payload.purity ?? ''),
      currentStock: Number(payload.currentStock ?? payload.stock ?? 0),
      minStockThreshold: Number(payload.minStockThreshold ?? payload.minThreshold ?? 0),
    };
    const reagent = await this.repo.save(this.repo.create(normalized));
    await this.audit.record(user, 'CREATE_REAGENT', 'reagent', { id: reagent.id, hazardLevel: reagent.hazardLevel });
    await this.alerts.cacheLowStockAlert(reagent, 'reagent');
    return reagent;
  }

  async findOne(id: string, em?: EntityManager) {
    const repo = em ? em.getRepository(Reagent) : this.repo;
    const reagent = await repo.findOneBy({ id });
    if (!reagent) throw new NotFoundException('试剂不存在');
    return reagent;
  }

  async adjustStock(id: string, delta: number, user: AuthUser, action = 'ADJUST_REAGENT_STOCK', reason?: string, relatedRecordId?: string, em?: EntityManager) {
    const repo = em ? em.getRepository(Reagent) : this.repo;
    const reagent = await this.findOne(id, em);
    const beforeStock = Number(reagent.currentStock);
    reagent.currentStock = beforeStock + delta;
    const saved = await repo.save(reagent);
    await this.audit.record(user, action, 'reagent', { id, delta, currentStock: saved.currentStock });
    await this.alerts.cacheLowStockAlert(saved, 'reagent');
    const changeType = this.resolveChangeType(action);
    await this.inventoryLogs.record({
      itemId: id,
      itemType: ItemType.Reagent,
      changeType,
      quantity: Math.abs(delta),
      beforeStock,
      afterStock: Number(saved.currentStock),
      reason: reason ?? action,
      operatorId: user.id,
      relatedRecordId,
    }, em);
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
