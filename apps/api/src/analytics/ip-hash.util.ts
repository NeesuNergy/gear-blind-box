import { createHash } from 'node:crypto';

/**
 * 对原始 IP 做单向哈希,原始 IP 不落库,只存哈希值,
 * 见 docs/03-spec/ANALYTICS-SPEC.md 第 6 节"隐私与合规"。
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}
