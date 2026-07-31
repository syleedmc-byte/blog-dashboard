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

const PILL_COLORS = ['pink', 'navy', 'orange', 'purple', 'teal', 'green']

export default function KpiCards({ kpi }) {
  const cards = [
    { icon: '👁', label: '조회수', value: fmtInt(kpi.views.value), field: kpi.views },
    { icon: '👤', label: '순방문자수', value: fmtInt(kpi.visitors.value), field: kpi.visitors },
    { icon: '🔁', label: '방문횟수', value: fmtInt(kpi.visits.value), field: kpi.visits },
    { icon: '⟳', label: '재방문율', value: kpi.revisit.value != null ? `${kpi.revisit.value.toFixed(2)}%` : '-', field: kpi.revisit },
    { icon: '⏱', label: '평균 사용시간', value: kpi.avgtime.value ?? '-', field: kpi.avgtime },
  ]
  return (
    <div className="stats-row">
      {cards.map((c, i) => (
        <div className={`stat-card pill-${PILL_COLORS[i % PILL_COLORS.length]}`} key={c.label}>
          <div className="stat-icon">{c.icon}</div>
          <div className="stat-value">{c.value}</div>
          <div className="stat-label">{c.label}</div>
          <DeltaLine field={c.field} />
        </div>
      ))}
      <div className="stat-card ai-card">
        <div className="stat-icon">🤖</div>
        {kpi.ai.value != null ? (
          <>
            <div className="stat-value">{kpi.ai.value}</div>
            <div className="stat-label">AI 브리핑 인용수</div>
            <div className="ai-sub">
              누적 <b>{kpi.ai.cumulative ?? '-'}</b>
            </div>
          </>
        ) : (
          <>
            <div className="stat-label">AI 브리핑 인용수</div>
            {/* 아직 수집 전인 지표라, 빈 값을 그냥 "-"로만 보여주면 고장난 것처럼 보인다.
                자리를 미리 만들어 두고 "수집 예정" 상태임을 명시해 둔다. */}
            <div className="ai-pending">📡 데이터 수집 예정</div>
            <div className="ai-sub">AI 검색 인용(GEO) 지표</div>
          </>
        )}
      </div>
    </div>
  )
}
