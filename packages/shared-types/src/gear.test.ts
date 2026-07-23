import { describe, expect, it } from 'vitest';
import { GEAR_CATEGORIES } from './gear';

describe('GEAR_CATEGORIES', () => {
  it('包含四个槶位,且无重复', () => {
    expect(GEAR_CATEGORIES).toHaveLength(4);
    expect(new Set(GEAR_CATEGORIES).size).toBe(GEAR_CATEGORIES.length);
  });

  it('包含 weapon/helmet/armor/operator 四个槶位', () => {
    expect(GEAR_CATEGORIES).toEqual(
      expect.arrayContaining(['weapon', 'helmet', 'armor', 'operator']),
    );
  });
});
