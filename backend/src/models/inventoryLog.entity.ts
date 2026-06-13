import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { InventoryChangeType, ItemType } from '../types/enums';

@Entity('inventory_logs')
export class InventoryLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  itemId!: string;

  @Column({ type: 'enum', enum: ItemType })
  itemType!: ItemType;

  @Column({ type: 'enum', enum: InventoryChangeType })
  changeType!: InventoryChangeType;

  @Column('decimal', { precision: 12, scale: 3 })
  quantity!: number;

  @Column('decimal', { precision: 12, scale: 3 })
  beforeStock!: number;

  @Column('decimal', { precision: 12, scale: 3 })
  afterStock!: number;

  @Column()
  reason!: string;

  @Column({ nullable: true })
  operatorId?: string;

  @Column({ nullable: true })
  relatedRecordId?: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
