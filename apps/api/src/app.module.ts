import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { DrawModule } from './draw/draw.module';
import { GearConfigModule } from './gear-config/gear-config.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // 全局限流兜底(按 IP,每分钟 ≤ 100 次),见 docs/03-spec/API-SPEC.md 第 5 节。
    // 接口级更严格的限流(如 /draw 每分钟 ≤ 20 次)在对应 controller 上按需追加 @Throttle()。
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    DrawModule,
    GearConfigModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
