/**
 * 首页占位。抽取交互、结果展示、评分区间设置等业务组件尚未实现,
 * 对应功能范围见 docs/01-prd/PRD.md 第 4 节,组件应落在 features/draw、features/score-range 下。
 */
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">GearBlindBox 装备盲盒</h1>
      <p className="max-w-md text-sm text-neutral-500">
        工程骨架搭建中,抽取与评分功能尚未接入。详见 <code>docs/</code> 下的产品与架构文档。
      </p>
    </main>
  );
}
