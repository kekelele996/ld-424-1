import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from '../models/auditLog.entity';
import { AuthUser } from '../types/interfaces';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>) {}

  async record(user: AuthUser, action: string, resource: string, metadata: Record<string, unknown> = {}, em?: EntityManager) {
    const repo = em ? em.getRepository(AuditLog) : this.auditRepo;
    await repo.save(repo.create({ actorId: user.id, actorRole: user.role, action, resource, metadata }));
  }
}
