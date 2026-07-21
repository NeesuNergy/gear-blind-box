import { Module } from '@nestjs/common';
import { GearConfigController } from './gear-config.controller';
import { GearConfigService } from './gear-config.service';

@Module({
  controllers: [GearConfigController],
  providers: [GearConfigService],
  exports: [GearConfigService],
})
export class GearConfigModule {}
