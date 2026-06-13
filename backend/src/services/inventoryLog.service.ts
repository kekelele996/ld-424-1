import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { InventoryLog } from '../models/inventoryLog.entity';
import { InventoryChangeType, ItemType } from '../types/enums';

@Injectable()
export class InventoryLogService {
  constructor(
    @InjectRepository(InventoryLog) private readonly repo: Repository<InventoryLog>,
  ) {}

  async record(params: {
    itemId: string;
    itemType: ItemType;
    changeType: InventoryChangeType;
    quantity: number;
    beforeStock: number;
    afterStock: number;
    reason: string;
    operatorId?: string;
    relatedRecordId?: string;
  }, em?: EntityManager) {
    const repo = em ? em.getRepository(InventoryLog) : this.repo;
    return repo.save(
      repo.create({
        itemId: params.itemId,
        itemType: params.itemType,
        changeType: params.changeType,
        quantity: params.quantity,
        beforeStock: params.beforeStock,
        afterStock: params.afterStock,
        reason: params.reason,
        operatorId: params.operatorId,
        relatedRecordId: params.relatedRecordId,
      }),
    );
  }

  async findByItem(itemId: string, itemType?: ItemType) {
    const where: Record<string, unknown> = { itemId };
    if (itemType) where.itemType = itemType;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async list(itemType?: ItemType, changeType?: InventoryChangeType) {
    const where: Record<string, unknown> = {};
    if (itemType) where.itemType = itemType;
    if (changeType) where.changeType = changeType;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }
}
