export default function ReferrerList({ items }) {
  const top = items.slice(0, 5)
  const maxPct = Math.max(...top.map((r) => r.pct ?? 0), 0.01)
  return (
    <div className="rank-bar-list">
      {top.map((r) => (
        <div className="rank-bar-row" key={r.name}>
          <div className="top">
            <span className="name">{r.name}</span>
            <span className="pct">{r.pct != null ? `${r.pct.toFixed(2)}%` : '-'}</span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${((r.pct ?? 0) / maxPct) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
