// 좌측 세로 사이드바. sections는 [{ label?, items: [{key,label,icon?,active,onClick}] }] 형태로
// 받아, 나중에 다른 메뉴 카테고리가 추가돼도 이 컴포넌트를 다시 손댈 필요가 없다.
export default function Sidebar({ sections }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">📊</span>
        <span className="sidebar-brand-text">디엠씨미디어 블로그 통계</span>
      </div>
      <nav className="sidebar-nav">
        {sections.map((section, i) => (
          <div className="sidebar-section" key={section.label ?? i}>
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
