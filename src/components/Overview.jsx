import Sparkline from './Sparkline.jsx'
import ViewsBarChart from './ViewsBarChart.jsx'
import { SERIES_VIEWS } from '../theme.js'

function fmtInt(n) {
  return typeof n === 'number' ? n.toLocaleString('ko-KR') : '-'
}

/** 메인 홈 화면: 참고 이미지(Droitdash 관리자 대시보드)의 배치 구조 — "누적 카드 → 바로 아래
 *  큰 막대그래프(+옆에 보조 카드들)" — 를 따라간다. 헤드라인+보조 인사이트는 카드 1개로
 *  압축하고, 나머지(카테고리 비중·인기게시물)는 그 아래로 자연스럽게 흐르게 배치한다. 여기서는
 *  숫자를 새로 계산하지 않고 parseExcel.js의 computeOverview 결과를 그대로 쓴다. */
const MIX_COLORS = ['var(--pill-purple)', 'var(--pill-teal)', 'var(--pill-orange)', 'var(--pill-pink)', 'var(--pill-navy)']
const MIX_ETC_COLOR = 'var(--line)'

export default function Overview({ overview, months, trend, onSelect }) {
  if (!overview || !months || months.length === 0) return null
  const latest = months[months.length - 1]
  const { topPosts, headline, secondaryInsights, topMover, categoryMix, cumulative } = overview
  const ai = latest.kpi.ai

  return (
    <div className="overview">
      <div className="cumulative-row">
        <div className="stat-card cumulative-card icon-teal">
          <div className="cumulative-card-head">
            <div className="stat-icon">👁</div>
            <div className="cumulative-card-label">누적 조회수</div>
          </div>
          <div className="stat-value">{fmtInt(cumulative.totalViews)}건</div>
        </div>
        <div className="stat-card cumulative-card icon-purple">
          <div className="cumulative-card-head">
            <div className="stat-icon">👤</div>
            <div className="cumulative-card-label">누적 순방문자수</div>
          </div>
          <div className="stat-value">{fmtInt(cumulative.totalVisitors)}명</div>
        </div>
        <div className="stat-card cumulative-card icon-orange">
          <div className="cumulative-card-head">
            <div className="stat-icon">🤖</div>
            <div className="cumulative-card-label">AI 브리핑 인용수</div>
          </div>
          {ai.value != null ? (
            <>
              <div className="stat-value">{ai.value}회</div>
              <div className="ai-sub">
                누적 <b>{fmtInt(cumulative.aiCumulative)}회</b>
              </div>
            </>
          ) : (
            <div className="stat-value">{fmtInt(cumulative.aiCumulative)}회</div>
          )}
        </div>
      </div>

      <div className="chart-side-grid">
        <div className="card">
          <p className="subcard-title"><span className="accent-dot" />월별 추이 비교</p>
          <p className="section-sub">최근 6개월치 조회수를 월별 막대로 비교합니다</p>
          <div className="chart-legend">
            <div className="item">
              <span className="swatch" style={{ background: SERIES_VIEWS }} />
              조회수
            </div>
          </div>
          <ViewsBarChart trend={trend?.slice(-6)} />
        </div>

        <div className="side-stack">
          {topMover && (
            <div className="stat-card mover-card">
              <div className="stat-icon">🚀</div>
              <div className="mover-title">급성장 게시물</div>
              {topMover.url ? (
                <a className="mover-value mover-link" href={topMover.url} target="_blank" rel="noopener noreferrer">
                  {topMover.title} <span className="link-ico">🔗</span>
                </a>
              ) : (
                <div className="mover-value">{topMover.title}</div>
              )}
              <div className="mover-trend">
                {topMover.prevLabel} {fmtInt(topMover.prevViews)}회 → {topMover.curLabel} {fmtInt(topMover.curViews)}회{' '}
                <b>(+{topMover.growthPct}%)</b>
              </div>
            </div>
          )}

          {categoryMix.length > 0 && (
            <div className="card topic-mix-card">
              <p className="subcard-title"><span className="accent-dot" />인기글 주제 비중</p>
              <div className="topic-mix-bar">
                {categoryMix.map((m, i) => (
                  <div
                    key={m.name}
                    className="topic-mix-seg"
                    style={{ width: `${m.pct}%`, background: m.name === '기타' ? MIX_ETC_COLOR : MIX_COLORS[i % MIX_COLORS.length] }}
                  >
                    {m.pct >= 8 ? `${m.pct}%` : ''}
                  </div>
                ))}
              </div>
              <div className="topic-mix-legend">
                {categoryMix.map((m, i) => (
                  <div className="topic-mix-legend-item" key={m.name}>
                    <span
                      className="topic-mix-legend-swatch"
                      style={{ background: m.name === '기타' ? MIX_ETC_COLOR : MIX_COLORS[i % MIX_COLORS.length] }}
                    />
                    {m.name} {m.pct}%
                  </div>
                ))}
              </div>
              <p className="topic-mix-caption">※ {latest.label} 기준 카테고리 분류 데이터(버블차트와 동일 기준) 상위 5개 카테고리의 언급 비중입니다.</p>
            </div>
          )}
        </div>
      </div>

      <div className="headline-banner">
        <button type="button" className="headline-top-row" onClick={() => onSelect(latest.key)}>
          <div className="headline-left">
            <p className="headline-eyebrow">통계 인사이트</p>
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
          <ul className="headline-bullets">
            {secondaryInsights.map((s) => (
              <li key={s.type}>
                <b>{s.title}</b>: {s.detail} <span className="muted">— {s.note}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="section-block">
        <h2 className="section-title">역대 인기 게시물 TOP10</h2>
        <p className="section-sub">전체 기간 통틀어 가장 많이 읽힌 글 top10입니다 (클릭하면 게시물로 바로 이동합니다)</p>
        <div className="card">
          <div className="ov-posts-grid">
            {[topPosts.slice(0, 5), topPosts.slice(5, 10)].map((col, colIdx) => (
              <div className="ov-posts-col" key={colIdx}>
                {col.map((p, i) => {
                  const rank = colIdx * 5 + i + 1
                  const body = (
                    <>
                      <div className={`ov-post-rank${rank > 5 ? ' second' : ''}`}>{rank}</div>
                      <div className="ov-post-title">
                        {p.title}
                        {p.url && <span className="link-ico">🔗</span>}
                      </div>
                      <div className="ov-post-views">{fmtInt(p.views)}회</div>
                    </>
                  )
                  return p.url ? (
                    <a className="ov-post-row" key={`${p.monthKey}-${p.title}`} href={p.url} target="_blank" rel="noopener noreferrer">
                      {body}
                    </a>
                  ) : (
                    <button type="button" className="ov-post-row" key={`${p.monthKey}-${p.title}`} onClick={() => onSelect(p.monthKey)}>
                      {body}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
