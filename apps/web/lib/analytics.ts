'use client';

import type { AnalyticsEvent, AnalyticsEventName } from '@gearblindbox/shared-types';
import { apiFetch } from './api-client';

/**
 * 轻量埋点 SDK 封装,对应 docs/03-spec/ANALYTICS-SPEC.md 第 2/3 节。
 * 具体业务事件的触发时机(在哪个交互里调用 track())由 features/* 决定,不在本文件实现。
 */

const ANONYMOUS_ID_KEY = 'gbb_anonymous_id';
const SESSION_ID_KEY = 'gbb_session_id';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // 极少数不支持 crypto.randomUUID 的环境兜底方案
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = generateUuid();
    window.localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = generateUuid();
    window.sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

export function track(eventName: AnalyticsEventName, properties?: Record<string, unknown>): void {
  const event: AnalyticsEvent = {
    eventName,
    sessionId: getSessionId(),
    properties,
    clientTimestamp: new Date().toISOString(),
  };

  // 埋点上报失败不能影响主功能体验(见 ANALYTICS-SPEC.md 第 2 节),此处静默捕获异常。
  void apiFetch('/events', {
    method: 'POST',
    anonymousId: getAnonymousId(),
    body: JSON.stringify({ events: [event] }),
  }).catch(() => {
    /* 静默失败,不阻塞主功能交互 */
  });
}
