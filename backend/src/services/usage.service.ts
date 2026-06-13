import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    if (normalized.itemType === ItemType.Reagent) {
      const reagent = await this.reagents.findOne(String(normalized.itemId));
      const dangerous = [HazardLevel.Toxic, HazardLevel.Explosive].includes(reagent.hazardLevel);
      if (dangerous && user.role === Role.Student) approvalStatus = UsageStatus.Pending;
      if (dangerous) await this.audit.record(user, 'DANGEROUS_REAGENT_USAGE_REQUEST', 'usageRecord', { itemId: reagent.id, hazardLevel: reagent.hazardLevel });
    }
    const record = await this.repo.save(this.repo.create({ ...normalized, userId: normalized.userId ?? user.id, approvalStatus }));
    if (approvalStatus === UsageStatus.Approved) {
      const reason = `领用：${normalized.purpose}`;
      if (normalized.itemType === ItemType.Reagent) {
        await this.reagents.adjustStock(String(normalized.itemId), -Number(normalized.quantity), user, 'USE_REAGENT', reason, record.id);
      } else {
        await this.consumables.adjustStock(String(normalized.itemId), -Number(normalized.quantity), user, 'USE_CONSUMABLE', reason, record.id);
      }
    }
    await this.audit.record(user, 'CREATE_USAGE', 'usageRecord', { id: record.id, approvalStatus });
    return record;
  }

  async approve(id: string, user: AuthUser) {
    const record = await this.repo.findOneBy({ id });
    if (!record) throw new BadRequestException('领用记录不存在');
    if (record.approvalStatus === UsageStatus.Approved) return record;
    record.approvalStatus = UsageStatus.Approved;
    record.approverId = user.id;
    const saved = await this.repo.save(record);
    const reason = `审批领用：${record.purpose}`;
    if (saved.itemType === ItemType.Reagent) await this.reagents.adjustStock(saved.itemId, -Number(saved.quantity), user, 'APPROVE_REAGENT_USAGE', reason, saved.id);
    else await this.consumables.adjustStock(saved.itemId, -Number(saved.quantity), user, 'APPROVE_CONSUMABLE_USAGE', reason, saved.id);
    await this.audit.record(user, 'APPROVE_USAGE', 'usageRecord', { id });
    return saved;
  }
}
