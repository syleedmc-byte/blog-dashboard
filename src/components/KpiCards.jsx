function DeltaLine({ field, suffix = '' }) {
  if (!field.hasPrev) return <div className="stat-delta none">전월 데이터 없음</div>
  if (field.dir == null) return <div className="stat-delta none">전월과 동일</div>
  const arrow = field.dir === 'up' ? '▲' : '▼'
  return (
    <div className={`stat-delta ${field.dir}`}>
      {arrow} {field.delta}
      {suffix} <span className="muted">전월 대비</span>
    </div>
  )
}

function fmtInt(n) {
  return typeof n === 'number' ? n.toLocaleString('ko-KR') : '-'
}

export default function KpiCards({ kpi }) {
  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-icon">👁</div>
        <div className="stat-label">조회수</div>
        <div className="stat-value">{fmtInt(kpi.views.value)}</div>
        <DeltaLine field={kpi.views} />
      </div>
      <div className="stat-card">
        <div className="stat-icon">👤</div>
        <div className="stat-label">순방문자수</div>
        <div className="stat-value">{fmtInt(kpi.visitors.value)}</div>
        <DeltaLine field={kpi.visitors} />
      </div>
      <div className="stat-card">
        <div className="stat-icon">🔁</div>
        <div className="stat-label">방문횟수</div>
        <div className="stat-value">{fmtInt(kpi.visits.value)}</div>
        <DeltaLine field={kpi.visits} />
      </div>
      <div className="stat-card">
        <div className="stat-icon">⟳</div>
        <div className="stat-label">재방문율</div>
        <div className="stat-value">{kpi.revisit.value != null ? `${kpi.revisit.value.toFixed(2)}%` : '-'}</div>
        <DeltaLine field={kpi.revisit} />
      </div>
      <div className="stat-card">
        <div className="stat-icon">⏱</div>
        <div className="stat-label">평균 사용시간</div>
        <div className="stat-value">{kpi.avgtime.value ?? '-'}</div>
        <DeltaLine field={kpi.avgtime} />
      </div>
      <div className="stat-card ai-card">
        <div className="stat-icon">🤖</div>
        <div className="stat-label">AI 브리핑 인용수</div>
        <div className="stat-value">{kpi.ai.value ?? '-'}</div>
        <div className="ai-sub">누적 <b>{kpi.ai.cumulative ?? '-'}</b></div>
      </div>
    </div>
  )
}
