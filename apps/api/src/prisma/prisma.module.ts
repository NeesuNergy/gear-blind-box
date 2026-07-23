import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * 全局数据库访问模块。标记为 @Global 后其余模块无需重复 import PrismaModule,
 * 只需在 constructor 中注入 PrismaService 即可,减少样板代码。
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
