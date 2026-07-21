import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from '../app/page';

describe('HomePage(骨架阶段占位页)', () => {
  it('渲染项目名称占位内容', () => {
    render(<HomePage />);
    expect(screen.getByText('GearBlindBox 装备盲盒')).toBeInTheDocument();
  });
});
