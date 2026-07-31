// 좌측 세로 사이드바. sections는 [{ label?, items: [{key,label,icon?,active,onClick}] }] 형태로
// 받아, 나중에 다른 메뉴 카테고리가 추가돼도 이 컴포넌트를 다시 손댈 필요가 없다.
// collapsed가 true면 아이콘만 남기고 텍스트를 숨겨 좁은 폭으로 접는다.
export default function Sidebar({ sections, collapsed, onToggleCollapse }) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">📊</span>
          {!collapsed && (
            <span className="sidebar-brand-text">
              디엠씨미디어
              <br />
              블로그 통계
            </span>
          )}
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
      <nav className="sidebar-nav">
        {sections.map((section, i) => (
          <div className="sidebar-section" key={section.label ?? i}>
            {section.label && !collapsed && <div className="sidebar-nav-label">{section.label}</div>}
            {section.items.map((item) => (
              <button
                type="button"
                key={item.key}
                className={`sidebar-nav-item${item.active ? ' active' : ''}`}
                onClick={item.onClick}
                title={collapsed ? item.label : undefined}
              >
                {item.icon && <span className="sidebar-nav-icon">{item.icon}</span>}
                {!collapsed && item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
