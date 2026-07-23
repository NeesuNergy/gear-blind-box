import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * 全局 Prisma 客户端。所有需要访问数据库的模块通过依赖注入使用本服务,
 * 不在各业务模块内各自 `new PrismaClient()`,统一管理连接生命周期。
 *
 * 不在 onModuleInit 中主动 `$connect()`:Prisma 会在首次实际查询时惰性连接,
 * 这样不依赖数据库的路由(如 /health)在数据库不可达时仍能正常完成应用启动,
 * 见 test/jest-e2e.setup.ts 的设计意图。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
