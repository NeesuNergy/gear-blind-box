import { Module } from '@nestjs/common';
import { GearConfigModule } from '../gear-config/gear-config.module';
import { DrawController } from './draw.controller';
import { DrawService } from './draw.service';

@Module({
  imports: [GearConfigModule],
  controllers: [DrawController],
  providers: [DrawService],
})
export class DrawModule {}
