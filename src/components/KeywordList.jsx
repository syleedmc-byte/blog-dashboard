export default function KeywordList({ items }) {
  const top = items.slice(0, 5)
  return (
    <div className="kw-list">
      {top.map((k, i) => (
        <div className="kw-row" key={k.name}>
          <div className="kw-rank">{i + 1}</div>
          <div className="kw-name">{k.name}</div>
          <div className="kw-pct">{k.pct != null ? `${k.pct.toFixed(2)}%` : '-'}</div>
        </div>
      ))}
    </div>
  )
}
