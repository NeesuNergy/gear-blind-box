/**
 * 埋点模块业务常量,禁止散落在 controller/service 中的裸数字,
 * 见 docs/04-engineering/CODING-STANDARDS.md 第1节。
 */

/** 按 X-Anonymous-Id 的埋点上报接口限流阈值,见 docs/03-spec/API-SPEC.md 第 5 节。 */
export const EVENTS_RATE_LIMIT = 60;

/** 埋点上报接口限流窗口(毫秒),见 docs/03-spec/API-SPEC.md 第 5 节。 */
export const EVENTS_RATE_LIMIT_WINDOW_MS = 60_000;
