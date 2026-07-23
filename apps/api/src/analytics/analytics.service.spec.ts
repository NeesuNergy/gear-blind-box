import { Prisma } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { TrackEventsRequestDto } from './dto/track-events.dto';

function createPrismaMock(createMany: jest.Mock): PrismaService {
  return { analyticsEvent: { createMany } } as unknown as PrismaService;
}

describe('AnalyticsService', () => {
  it('批量写入事件,补全 anonymousId/ipHash/userAgent', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const service = new AnalyticsService(createPrismaMock(createMany));
    const dto: TrackEventsRequestDto = {
      events: [
        { eventName: 'page_view', sessionId: 'session-1', properties: { path: '/' } },
        { eventName: 'draw_triggered', sessionId: 'session-1' },
      ],
    };

    await service.track(dto, { anonymousId: 'anon-1', ipHash: 'hash-1', userAgent: 'ua-1' });

    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          eventName: 'page_view',
          anonymousId: 'anon-1',
          sessionId: 'session-1',
          properties: { path: '/' },
          ipHash: 'hash-1',
          userAgent: 'ua-1',
        },
        {
          eventName: 'draw_triggered',
          anonymousId: 'anon-1',
          sessionId: 'session-1',
          properties: Prisma.JsonNull,
          ipHash: 'hash-1',
          userAgent: 'ua-1',
        },
      ],
    });
  });

  it('写入失败时静默丢弃,不向上抛出异常(API-SPEC.md 3.3 节:该接口对失败宽容)', async () => {
    const createMany = jest.fn().mockRejectedValue(new Error('db down'));
    const service = new AnalyticsService(createPrismaMock(createMany));
    const dto: TrackEventsRequestDto = {
      events: [{ eventName: 'page_view', sessionId: 'session-1' }],
    };

    await expect(service.track(dto, { anonymousId: 'anon-1' })).resolves.toBeUndefined();
  });
});
