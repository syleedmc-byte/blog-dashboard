// 데스크탑 전용 — 항상 펼쳐진 채로 고정 표시된다 (모바일 대응 불필요).
// "월별 리포트" 전용 컴포넌트가 아니라, 임의의 섹션 목록을 받아 그리는 범용 내비게이션이다.
// 지금은 App.jsx가 [홈, 연도별 월 그룹] 두 섹션만 넘기지만, 나중에 "월별 링크 외의 다른
// 메뉴/카테고리"가 생기면 Sidebar.jsx를 다시 손댈 필요 없이 그 섹션을 배열에 추가하기만 하면 된다.
// sections: [{ label?: string, items: [{ key, label, icon?, active, onClick }] }]
export default function Sidebar({ sections }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">📊</span>
        <span className="sidebar-brand-text">블로그 통계</span>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section, si) => (
          <div className="sidebar-section" key={section.label ?? `section-${si}`}>
            {section.label && <div className="sidebar-nav-label">{section.label}</div>}
            {section.items.map((item) => (
              <button
                type="button"
                key={item.key}
                className={`sidebar-nav-item${item.active ? ' active' : ''}`}
                onClick={item.onClick}
              >
                {item.icon && <span className="sidebar-nav-icon">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
