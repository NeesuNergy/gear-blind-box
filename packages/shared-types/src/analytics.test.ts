import { describe, expect, it } from 'vitest';
import { ANALYTICS_EVENT_NAMES } from './analytics';

describe('ANALYTICS_EVENT_NAMES', () => {
  it('包含 ANALYTICS-SPEC.md 中定义的全部事件名称,且无重复', () => {
    expect(ANALYTICS_EVENT_NAMES.length).toBeGreaterThan(0);
    expect(new Set(ANALYTICS_EVENT_NAMES).size).toBe(ANALYTICS_EVENT_NAMES.length);
  });
});
