import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UsageRecord } from '../models/usageRecord.entity';
import { HazardLevel, ItemType, Role, UsageStatus } from '../types/enums';
import { AuthUser } from '../types/interfaces';
import { AuditService } from './audit.service';
import { ConsumableService } from './consumable.service';
import { ReagentService } from './reagent.service';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageRecord) private readonly repo: Repository<UsageRecord>,
    private readonly dataSource: DataSource,
    private readonly reagents: ReagentService,
    private readonly consumables: ConsumableService,
    private readonly audit: AuditService,
  ) { }

  list() {
    return this.repo.find({ order: { usageDate: 'DESC' } });
  }

  async create(payload: Partial<UsageRecord> & Record<string, unknown>, user: AuthUser) {
    const normalized: Partial<UsageRecord> = {
      ...payload,
      approvalStatus: (payload.approvalStatus ?? payload.status ?? UsageStatus.Approved) as UsageStatus,
      quantity: Number(payload.quantity ?? 0),
      purpose: String(payload.purpose ?? payload.description ?? ''),
    };
    let approvalStatus = normalized.approvalStatus ?? UsageStatus.Approved;
    let dangerous = false;
    let dangerousReagentId: string | undefined;
    let dangerousHazardLevel: HazardLevel | undefined;
    if (normalized.itemType === ItemType.Reagent) {
      const reagent = await this.reagents.findOne(String(normalized.itemId));
      dangerous = [HazardLevel.Toxic, HazardLevel.Explosive].includes(reagent.hazardLevel);
      if (dangerous) {
        dangerousReagentId = reagent.id;
        dangerousHazardLevel = reagent.hazardLevel;
      }
      if (dangerous && user.role === Role.Student) approvalStatus = UsageStatus.Pending;
    }
    if (approvalStatus === UsageStatus.Approved) {
      return this.dataSource.transaction(async (em) => {
        const record = await em.save(em.create(UsageRecord, { ...normalized, userId: normalized.userId ?? user.id, approvalStatus }));
        const reason = `领用：${normalized.purpose}`;
        if (normalized.itemType === ItemType.Reagent) {
          await this.reagents.adjustStock(String(normalized.itemId), -Number(normalized.quantity), user, 'USE_REAGENT', reason, record.id, em);
        } else {
          await this.consumables.adjustStock(String(normalized.itemId), -Number(normalized.quantity), user, 'USE_CONSUMABLE', reason, record.id, em);
        }
        if (dangerous) await this.audit.record(user, 'DANGEROUS_REAGENT_USAGE_REQUEST', 'usageRecord', { itemId: dangerousReagentId, hazardLevel: dangerousHazardLevel }, em);
        await this.audit.record(user, 'CREATE_USAGE', 'usageRecord', { id: record.id, approvalStatus }, em);
        return record;
      });
    }
    if (dangerous) await this.audit.record(user, 'DANGEROUS_REAGENT_USAGE_REQUEST', 'usageRecord', { itemId: dangerousReagentId, hazardLevel: dangerousHazardLevel });
    const record = await this.repo.save(this.repo.create({ ...normalized, userId: normalized.userId ?? user.id, approvalStatus }));
    await this.audit.record(user, 'CREATE_USAGE', 'usageRecord', { id: record.id, approvalStatus });
    return record;
  }

  async approve(id: string, user: AuthUser) {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new BadRequestException('领用记录不存在');
    if (existing.approvalStatus === UsageStatus.Approved) return existing;
    return this.dataSource.transaction(async (em) => {
      const record = await em.findOneBy(UsageRecord, { id });
      if (!record) throw new BadRequestException('领用记录不存在');
      record.approvalStatus = UsageStatus.Approved;
      record.approverId = user.id;
      const saved = await em.save(record);
      const reason = `审批领用：${record.purpose}`;
      if (saved.itemType === ItemType.Reagent) {
        await this.reagents.adjustStock(saved.itemId, -Number(saved.quantity), user, 'APPROVE_REAGENT_USAGE', reason, saved.id, em);
      } else {
        await this.consumables.adjustStock(saved.itemId, -Number(saved.quantity), user, 'APPROVE_CONSUMABLE_USAGE', reason, saved.id, em);
      }
      await this.audit.record(user, 'APPROVE_USAGE', 'usageRecord', { id }, em);
      return saved;
    });
  }
}
