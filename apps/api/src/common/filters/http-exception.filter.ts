import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorCode, ApiErrorResponse } from '@gearblindbox/shared-types';

/**
 * 业务异常统一携带的错误结构。业务代码抛出该异常即可自动映射为
 * docs/03-spec/API-SPEC.md 第 2 节定义的 `{ success: false, error: { code, message } }` 响应体。
 *
 * 示例(业务实现阶段使用,当前骨架不包含具体业务判断逻辑):
 * throw new ApiBusinessException('SCORE_RANGE_INFEASIBLE', '当前设定的评分区间在现有配置下无法达成', HttpStatus.OK);
 */
export class ApiBusinessException extends HttpException {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}

/** 提取 HttpException 响应体中的可读错误信息(兼容 class-validator 返回的字符串数组)。 */
function extractHttpExceptionMessage(rawResponse: unknown, fallback: string): string {
  if (typeof rawResponse === 'string') return rawResponse;
  if (typeof rawResponse === 'object' && rawResponse !== null && 'message' in rawResponse) {
    const { message } = rawResponse;
    if (Array.isArray(message)) return message.join('; ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

/**
 * 全局异常过滤器:兜底捕获所有异常,统一转换为 ApiErrorResponse 结构,
 * 避免默认的 NestJS 异常结构泄露到前端,保持响应契约一致。
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof ApiBusinessException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as {
        code: ApiErrorCode;
        message: string;
      };
      const payload: ApiErrorResponse = {
        success: false,
        error: { code: body.code, message: body.message },
      };
      response.status(status).json(payload);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const rawResponse = exception.getResponse();
      const message = extractHttpExceptionMessage(rawResponse, exception.message);
      // 400 类错误(如 ValidationPipe 抛出的 DTO 校验失败)统一归类为 VALIDATION_ERROR,
      // 其余 HttpException(如未预期的 4xx/5xx)归类为 INTERNAL_ERROR。
      const code: ApiErrorCode =
        status === Number(HttpStatus.BAD_REQUEST) ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
      const payload: ApiErrorResponse = {
        success: false,
        error: { code, message },
      };
      response.status(status).json(payload);
      return;
    }

    // 未预期的异常:不向客户端暴露内部细节,仅返回通用错误码
    const payload: ApiErrorResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '服务器发生未预期的错误' },
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(payload);
  }
}
