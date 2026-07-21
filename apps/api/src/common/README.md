# common/

全局中间件、过滤器、拦截器、守卫的存放目录,不包含任何业务领域逻辑。

- `filters/` —— 全局异常过滤器,统一响应错误结构(见 `http-exception.filter.ts`)。
- `interceptors/` —— 全局响应拦截器,统一成功响应结构(见 `response.interceptor.ts`)。
- `guards/`(待补充) —— 鉴权/限流相关的可复用 Guard,当前限流通过根 `AppModule` 全局注册的 `ThrottlerGuard` 提供,接口级更细粒度的限流待业务实现阶段通过 `@Throttle()` 装饰器补充。
- `dto/`(待补充) —— 跨模块复用的通用 DTO/校验片段。

对应规范:`docs/03-spec/API-SPEC.md`、`docs/04-engineering/DIRECTORY-STRUCTURE.md`。
