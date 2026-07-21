import { Controller, Get } from '@nestjs/common';
import { GearConfigService, type GearConfigSnapshot } from './gear-config.service';

/**
 * 对应 docs/03-spec/API-SPEC.md 3.1 节:GET /api/v1/gear-config
 */
@Controller('gear-config')
export class GearConfigController {
  constructor(private readonly gearConfigService: GearConfigService) {}

  @Get()
  getCurrentConfig(): GearConfigSnapshot {
    return this.gearConfigService.getCurrentConfig();
  }
}
