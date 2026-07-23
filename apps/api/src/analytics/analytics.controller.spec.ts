import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { AnalyticsController } from './analytics.controller';
import type { AnalyticsService } from './analytics.service';
import type { TrackEventsRequestDto } from './dto/track-events.dto';

function createRequestMock(overrides?: Partial<Request>): Request {
  return {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest-test-agent' },
    ...overrides,
  } as unknown as Request;
}

describe('AnalyticsController', () => {
  const dto: TrackEventsRequestDto = {
    events: [{ eventName: 'page_view', sessionId: 'session-1' }],
  };

  it('缺少 X-Anonymous-Id 请求头时抛出 400(对应 API-SPEC.md VALIDATION_ERROR)', async () => {
    const track = jest.fn();
    const analyticsService = { track } as unknown as AnalyticsService;
    const controller = new AnalyticsController(analyticsService);

    await expect(controller.track(dto, undefined, createRequestMock())).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(track).not.toHaveBeenCalled();
  });

  it('携带 X-Anonymous-Id 时始终返回空对象(即使写入失败也不暴露细节)', async () => {
    const track = jest.fn().mockResolvedValue(undefined);
    const analyticsService = { track } as unknown as AnalyticsService;
    const controller = new AnalyticsController(analyticsService);

    const result = await controller.track(dto, 'anon-1', createRequestMock());

    expect(result).toEqual({});
    expect(track).toHaveBeenCalledWith(dto, {
      anonymousId: 'anon-1',
      ipHash: expect.any(String),
      userAgent: 'jest-test-agent',
    });
  });
});
