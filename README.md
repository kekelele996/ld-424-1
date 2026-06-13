# 科研试剂与耗材库存管理 API 服务

## Docker 启动

```bash
docker compose up --build
```

Swagger 地址：http://localhost:19303/api-docs

本服务提供试剂、耗材、入库、领用、盘点、库存变动流水和低库存预警 API。默认鉴权支持在请求头传入 `Authorization: Bearer <jwt>`，也支持开发调试头 `x-user-role`、`x-user-id`。

### 核心能力说明

- **库存变动流水**：`GET /inventory-logs` 查询全部变动，`GET /inventory-logs/:itemId` 按试剂/耗材 ID 查询历史记录（可加 `?itemType=Reagent|Consumable` 过滤）。每条流水记录变动类型（入库/领用/审批/盘点差异）、变动数量、变动前后库存、业务原因（含采购单号、批号、领用用途、盘点差异说明）、操作人及关联业务单 ID。
- **事务一致性**：入库、直接通过的领用、领用审批、盘点四个写操作均使用 PostgreSQL 事务，将业务单保存、库存调整、流水写入、审计日志统一在一个事务中提交/回滚，避免后续失败造成孤立业务单或库存数据不一致。

## 技术栈

| 类型 | 技术 |
| --- | --- |
| 后端框架 | NestJS + TypeScript |
| 数据库 | PostgreSQL 15 |
| ORM | TypeORM |
| 缓存 | Redis 7 |
| 认证 | JWT |
| API 文档 | Swagger |
| 编排 | Docker Compose |

## 目录结构

```text
backend/src/
├── routes/
├── controllers/
├── services/
├── models/
├── middlewares/
├── types/
├── utils/
├── config/
└── database/
```

枚举定义位于 `backend/src/types/enums.ts`，包含 HazardLevel、UsageStatus、StorageCondition、ItemType、QCResult、InventoryCheckStatus、InventoryChangeType 等。

## License

MIT
