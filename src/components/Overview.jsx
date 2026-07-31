import TrendChart from './TrendChart.jsx'
import { SERIES_VIEWS, SERIES_VISITORS } from '../theme.js'

function fmtInt(n) {
  return typeof n === 'number' ? n.toLocaleString('ko-KR') : '-'
}

/** "홈" 화면: 개별 달 페이지를 축소 복제한 게 아니라, 엑셀에 있는 모든 달을 하나로 합쳐서
 *  비교·요약하는 전용 구성이다 (버블차트는 여기서 다루지 않고 달별 페이지에서만 확인).
 *  overview는 src/lib/parseExcel.js의 computeOverview()가 이미 계산해 둔 값을 그대로 쓴다
 *  (숫자를 여기서 다시 손으로 만들지 않음). 카드를 클릭하면 관련된 달의 상세 페이지로 이동한다. */
export default function Overview({ overview, onSelect }) {
  if (!overview) return null
  const { monthCount, totalViews, totalVisitors, avgRevisit, avgAvgtime, bestGrowth, topVisitorMonth, topPosts, topReferrer, topKeyword, trend, latestKey } =
    overview

  return (
    <div className="overview">
      <div className="overview-hero-row">
        <button type="button" className="overview-hero-card" onClick={() => onSelect(latestKey)}>
          <div className="overview-hero-label">
            총 조회수 <span className="overview-hero-sub">최근 {monthCount}개월 합계</span>
          </div>
          <div className="overview-hero-value">{fmtInt(totalViews)}</div>
        </button>

        <div className="overview-mini-grid">
          <button type="button" className="overview-mini-card" onClick={() => onSelect(latestKey)}>
            <div className="overview-mini-label">총 순방문자수</div>
            <div className="overview-mini-value">{fmtInt(totalVisitors)}</div>
          </button>

          {bestGrowth && (
            <button type="button" className="overview-mini-card accent" onClick={() => onSelect(bestGrowth.monthKey)}>
              <div className="overview-mini-label">가장 크게 성장한 지표</div>
              <div className="overview-mini-value">
                {bestGrowth.label} {bestGrowth.delta}
              </div>
              <div className="overview-mini-sub">{bestGrowth.monthLabel} 전월 대비</div>
            </button>
          )}

          {topVisitorMonth && (
            <button type="button" className="overview-mini-card" onClick={() => onSelect(topVisitorMonth.key)}>
              <div className="overview-mini-label">가장 방문자 많았던 달</div>
              <div className="overview-mini-value">{topVisitorMonth.label}</div>
              <div className="overview-mini-sub">순방문자 {fmtInt(topVisitorMonth.value)}명</div>
            </button>
          )}

          <button type="button" className="overview-mini-card" onClick={() => onSelect(latestKey)}>
            <div className="overview-mini-label">재방문율 평균</div>
            <div className="overview-mini-value">{avgRevisit.toFixed(2)}%</div>
            <div className="overview-mini-sub">방문횟수 가중평균</div>
          </button>

          <button type="button" className="overview-mini-card" onClick={() => onSelect(latestKey)}>
            <div className="overview-mini-label">평균 사용시간</div>
            <div className="overview-mini-value">{avgAvgtime ?? '-'}</div>
            <div className="overview-mini-sub">방문횟수 가중평균</div>
          </button>
        </div>
      </div>

      <div className="section-block">
        <div className="section-head">
          <span className="badge">01</span>
          <h2 className="section-title">월별 추이 비교</h2>
        </div>
        <p className="section-sub">조회수·순방문자수를 달마다 나란히 비교합니다</p>
        <div className="card">
          <div className="chart-legend">
            <div className="item">
              <span className="swatch" style={{ background: SERIES_VIEWS }} />
              조회수
            </div>
            <div className="item">
              <span className="swatch" style={{ background: SERIES_VISITORS }} />
              순방문자수
            </div>
          </div>
          <TrendChart trend={trend} />
        </div>
      </div>

      <div className="top-grid">
        <div>
          <div className="section-head">
            <span className="badge">★</span>
            <h2 className="section-title">역대 인기 게시물</h2>
          </div>
          <p className="section-sub">전체 기간 통틀어 가장 많이 읽힌 글입니다</p>
          <div className="overview-post-list">
            {topPosts.map((p, i) => (
              <button type="button" className="overview-post-card" key={`${p.monthKey}-${p.title}`} onClick={() => onSelect(p.monthKey)}>
                <div className="overview-post-rank">{i + 1}</div>
                <div className="overview-post-body">
                  <div className="overview-post-title">{p.title}</div>
                  <div className="overview-post-meta">
                    {p.monthLabel} · {fmtInt(p.views)}회
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="section-head">
            <span className="badge">02</span>
            <h2 className="section-title">통합 유입 요약</h2>
          </div>
          <p className="section-sub">전체 기간 비중을 방문횟수로 가중평균한 1위입니다</p>
          <div className="card overview-inflow-card">
            <button type="button" className="overview-inflow-row" onClick={() => onSelect(latestKey)}>
              <span className="overview-inflow-label">유입경로 1위</span>
              <span className="overview-inflow-value">{topReferrer?.name ?? '-'}</span>
              <span className="overview-inflow-pct">{topReferrer ? `${topReferrer.avgPct}%` : ''}</span>
            </button>
            <button type="button" className="overview-inflow-row" onClick={() => onSelect(latestKey)}>
              <span className="overview-inflow-label">유입검색어 1위</span>
              <span className="overview-inflow-value">{topKeyword?.name ?? '-'}</span>
              <span className="overview-inflow-pct">{topKeyword ? `${topKeyword.avgPct}%` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
