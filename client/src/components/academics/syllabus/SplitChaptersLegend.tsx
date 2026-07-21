export function SplitChaptersLegend() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Split Chapters</h3>
      <p className="text-xs text-gray-500 mb-3">
        These chapters span two months. Part 2 can only be scheduled after Part 1 is completed.
      </p>
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <span><strong>GOC</strong> — Chemistry: Part 1 (August) → Part 2 (September)</span>
        <span><strong>Biotechnology</strong> — Biology: Part 1 (September) → Part 2 (October)</span>
        <span><strong>Genetics</strong> — Biology: Part 1 (September) → Part 2 (October)</span>
      </div>
    </div>
  )
}
