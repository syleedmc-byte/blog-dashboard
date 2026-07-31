function fmtInt(n) {
  return typeof n === 'number' ? n.toLocaleString('ko-KR') : '-'
}

/** 첫 화면(홈): 특정 달로 바로 들어가지 않고, 모든 달을 최신순으로 보여주는 인덱스 페이지.
 *  카드를 클릭하면 그 달의 전체 리포트로 들어간다(=onSelect가 URL 해시를 바꿔줌). */
export default function MonthIndex({ months, onSelect, sourceFile }) {
  const latestFirst = [...months].reverse()
  return (
    <div className="month-index">
      <div className="header">
        <div>
          <h1>월간 블로그 통계</h1>
          <p>보고 싶은 달을 선택하세요.</p>
        </div>
      </div>
      <p className="top-note">데이터 출처: {sourceFile} (data/ 폴더에서 자동으로 읽어옵니다)</p>

      <div className="month-index-grid">
        {latestFirst.map((m) => (
          <button type="button" className="month-index-card" key={m.key} onClick={() => onSelect(m.key)}>
            <div className="month-index-card-head">
              <span className="month-index-card-label">{m.label}</span>
              <span className="month-index-card-period">{m.period}</span>
            </div>
            <div className="month-index-card-kpis">
              <div>
                <span className="month-index-kpi-label">조회수</span>
                <span className="month-index-kpi-value">{fmtInt(m.kpi.views.value)}</span>
              </div>
              <div>
                <span className="month-index-kpi-label">순방문자수</span>
                <span className="month-index-kpi-value">{fmtInt(m.kpi.visitors.value)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
