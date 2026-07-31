import Sparkline from './Sparkline.jsx'
import TrendAreaChart from './TrendAreaChart.jsx'
import { SERIES_VIEWS, SERIES_VISITORS } from '../theme.js'

function fmtInt(n) {
  return typeof n === 'number' ? n.toLocaleString('ko-KR') : '-'
}

/** "인덱스" 화면: 달별 페이지를 축소 복제하지 않고, 이번 달 데이터에서 자동으로 뽑은 "헤드라인
 *  인사이트"(overview.headline) 한 개 + 그를 뒷받침하는 지표 1개를 배너로 보여주고, 그 아래
 *  보조 인사이트(overview.secondaryInsights) 2~3개, "월별 추이 비교", "역대 인기 게시물"을
 *  번호/배지 없이 자연스럽게 흐르는 순서로 배치한다. 여기서는 숫자를 새로 계산하지 않고
 *  parseExcel.js의 computeOverview 결과를 그대로 쓴다. */
export default function Overview({ overview, months, trend, onSelect }) {
  if (!overview || !months || months.length === 0) return null
  const latest = months[months.length - 1]
  const { topPosts, risingPosts, headline, secondaryInsights } = overview

  return (
    <div className="overview">
      <button type="button" className="headline-banner" onClick={() => onSelect(latest.key)}>
        <div className="headline-left">
          <p className="headline-eyebrow">{latest.label} 헤드라인 인사이트</p>
          <p className="headline-sentence">{headline.sentence}</p>
        </div>
        <div className="headline-right">
          <div className="headline-metric-top">
            <span className="headline-metric-label">{headline.metricLabel}</span>
            {headline.sparkline && headline.sparkline.length > 1 && (
              <Sparkline values={headline.sparkline} color={SERIES_VIEWS} />
            )}
          </div>
          <div className="headline-metric-value">{headline.value}</div>
          {headline.trendText && <div className="headline-trend">{headline.trendText}</div>}
        </div>
      </button>

      {secondaryInsights.length > 0 && (
        <div className="secondary-insights">
          {secondaryInsights.map((s) => (
            <div className="secondary-card" key={s.type}>
              <div className="secondary-title">{s.title}</div>
              <div className="secondary-detail">{s.detail}</div>
              <div className="secondary-note">{s.note}</div>
            </div>
          ))}
        </div>
      )}

      <div className="section-block">
        <h2 className="section-title">월별 추이 비교</h2>
        <p className="section-sub">엑셀에 있는 전체 {trend?.length ?? 0}개월치 조회수·순방문자수를 나란히 비교합니다</p>
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
          <TrendAreaChart trend={trend} />
        </div>
      </div>

      <div className="top-grid">
        <div>
          <h2 className="section-title">역대 인기 게시물 TOP3</h2>
          <p className="section-sub">전체 기간 통틀어 가장 많이 읽힌 글 top3입니다</p>
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
          <h2 className="section-title">이번 달 신규 진입 게시물</h2>
          <p className="section-sub">전월 TOP10에는 없다가 {latest.label}에 새로 올라온 글입니다</p>
          {risingPosts.length > 0 ? (
            <div className="overview-post-list">
              {risingPosts.map((p) => (
                <button type="button" className="overview-post-card rising" key={p.title} onClick={() => onSelect(latest.key)}>
                  <div className="overview-post-rank rising">NEW</div>
                  <div className="overview-post-body">
                    <div className="overview-post-title">{p.title}</div>
                    <div className="overview-post-meta">{fmtInt(p.views)}회</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="overview-empty-note">전월 대비 새로 진입한 게시물이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
