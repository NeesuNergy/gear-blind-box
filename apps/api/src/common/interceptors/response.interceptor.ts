import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { ApiSuccessResponse } from '@gearblindbox/shared-types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 全局响应包装拦截器:将 controller 返回值统一包装为
 * `{ success: true, data }`,对应 docs/03-spec/API-SPEC.md 第 2 节的通用响应结构。
 * 业务代码只需返回 data 本身,不需要感知外层包装。
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(map((data) => ({ success: true, data })));
  }
}
