// 데스크탑 전용 — 항상 펼쳐진 채로 고정 표시된다 (모바일 대응 불필요).
export default function Sidebar({ months, activeKey, onSelectHome, onSelectMonth }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">📊</span>
        <span className="sidebar-brand-text">블로그 통계</span>
      </div>

      <nav className="sidebar-nav">
        <button type="button" className={`sidebar-nav-item${activeKey == null ? ' active' : ''}`} onClick={onSelectHome}>
          <span className="sidebar-nav-icon">🏠</span>홈
        </button>

        <div className="sidebar-nav-label">월별 리포트</div>
        {[...months].reverse().map((m) => (
          <button
            type="button"
            key={m.key}
            className={`sidebar-nav-item${activeKey === m.key ? ' active' : ''}`}
            onClick={() => onSelectMonth(m.key)}
          >
            <span className="sidebar-nav-icon">🗓️</span>
            {m.year}.{String(m.monthNumber).padStart(2, '0')}
          </button>
        ))}
      </nav>
    </aside>
  )
}
