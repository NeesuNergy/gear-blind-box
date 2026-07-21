/**
 * 对应 docs/03-spec/ANALYTICS-SPEC.md 第 3 节事件清单。
 * 仅为类型契约,具体上报/聚合逻辑不在本包实现。
 */

export type AnalyticsEventName =
  | 'page_view'
  | 'session_start'
  | 'draw_triggered'
  | 'draw_result_shown'
  | 'draw_infeasible_shown'
  | 'score_range_set'
  | 'score_range_cleared'
  | 'share_click';

export interface AnalyticsEvent<
  TProperties extends Record<string, unknown> = Record<string, unknown>,
> {
  eventName: AnalyticsEventName;
  sessionId: string;
  properties?: TProperties;
  clientTimestamp?: string;
}

/** POST /api/v1/events 请求体,见 API-SPEC.md 3.3 节。 */
export interface TrackEventsRequestBody {
  events: AnalyticsEvent[];
}

/** 事件名称的运行时枚举值,供请求体校验等场景使用,需与上方联合类型保持同步。 */
export const ANALYTICS_EVENT_NAMES: readonly AnalyticsEventName[] = [
  'page_view',
  'session_start',
  'draw_triggered',
  'draw_result_shown',
  'draw_infeasible_shown',
  'score_range_set',
  'score_range_cleared',
  'share_click',
] as const;
