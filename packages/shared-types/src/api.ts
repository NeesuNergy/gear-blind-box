/**
 * 对应 docs/03-spec/API-SPEC.md 第 2/3 节的通用响应契约。
 */

export type ApiErrorCode =
  | 'INVALID_SCORE_RANGE'
  | 'SCORE_RANGE_INFEASIBLE'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

/** POST /api/v1/draw 请求体,见 API-SPEC.md 3.2 节。 */
export interface DrawRequestBody {
  sessionId: string;
  minScore?: number;
  maxScore?: number;
}
