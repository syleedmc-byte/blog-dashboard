// 좌측 세로 사이드바 대신, 페이지 최상단에 가로로 배치되는 가벼운 내비게이션.
// sections는 Sidebar 때와 같은 모양([{ label?, items }])을 그대로 받아, 평평하게 한 줄로 펼친다 —
// 나중에 다른 메뉴 카테고리가 추가돼도 이 컴포넌트를 다시 손댈 필요가 없다.
export default function TopNav({ sections }) {
  const items = sections.flatMap((s) => s.items)
  return (
    <nav className="topnav">
      <div className="topnav-brand">
        <span className="topnav-brand-icon">📊</span>
        블로그 통계
      </div>
      <div className="topnav-items">
        {items.map((item) => (
          <button type="button" key={item.key} className={`topnav-item${item.active ? ' active' : ''}`} onClick={item.onClick}>
            {item.icon && <span className="topnav-item-icon">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
