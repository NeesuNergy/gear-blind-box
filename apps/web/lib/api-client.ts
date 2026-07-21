import type { ApiErrorResponse, ApiResponse } from '@gearblindbox/shared-types';

/**
 * 通用 API 请求封装。业务模块(features/*)通过本函数与后端交互,
 * 统一处理 { success, data } / { success, error } 响应结构(见 docs/03-spec/API-SPEC.md 第 2 节)。
 * 具体业务接口调用(抽取、获取配置等)由各 feature 自行封装,不在本文件实现。
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export class ApiRequestError extends Error {
  constructor(public readonly response: ApiErrorResponse) {
    super(response.error.message);
    this.name = 'ApiRequestError';
  }
}

export async function apiFetch<TData>(
  path: string,
  init?: RequestInit & { anonymousId?: string },
): Promise<TData> {
  const { anonymousId, headers, ...rest } = init ?? {};

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(anonymousId ? { 'X-Anonymous-Id': anonymousId } : {}),
      ...headers,
    },
  });

  const body = (await response.json()) as ApiResponse<TData>;

  if (!body.success) {
    throw new ApiRequestError(body);
  }

  return body.data;
}
