import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * 根路径健康检查,用于部署平台(容器/负载均衡)探活。
 * 不承载任何业务逻辑。
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }
}
