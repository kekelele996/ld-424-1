import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryLogService } from '../services/inventoryLog.service';
import { InventoryChangeType, ItemType } from '../types/enums';
import { ok } from '../utils/response';

@ApiTags('inventory-logs')
@ApiBearerAuth()
@Controller('inventory-logs')
export class InventoryLogController {
  constructor(private readonly service: InventoryLogService) {}

  @Get()
  async list(
    @Query('itemType') itemType?: ItemType,
    @Query('changeType') changeType?: InventoryChangeType,
  ) {
    return ok(await this.service.list(itemType, changeType));
  }

  @Get(':itemId')
  async findByItem(
    @Param('itemId') itemId: string,
    @Query('itemType') itemType?: ItemType,
  ) {
    return ok(await this.service.findByItem(itemId, itemType));
  }
}
