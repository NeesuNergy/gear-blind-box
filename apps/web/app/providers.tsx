'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * 全局 Provider 容器。服务端数据获取统一通过 React Query 管理(见 ARCHITECTURE.md 技术栈选型表),
 * 本文件仅提供基础设施,不包含任何具体业务查询逻辑。
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
