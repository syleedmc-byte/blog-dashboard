import Sparkline from './Sparkline.jsx'
import ViewsBarChart from './ViewsBarChart.jsx'
import { SERIES_VIEWS, SERIES_VISITORS } from '../theme.js'

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
        <div className="stat-card cumulative-card">
          <div className="stat-icon">👁</div>
          <div className="stat-value">{fmtInt(cumulative.totalViews)}</div>
          <div className="stat-label">누적 조회수 ({cumulative.year}년)</div>
          <div className="cumulative-bottom">
            {cumulative.viewsSparkline.length > 1 && <Sparkline values={cumulative.viewsSparkline} color={SERIES_VIEWS} />}
            {cumulative.momViewsPct != null && (
              <span className={`stat-delta ${cumulative.momViewsPct >= 0 ? 'up' : 'down'}`}>
                {cumulative.momViewsPct >= 0 ? '▲' : '▼'} {Math.abs(cumulative.momViewsPct)}% <span className="muted">전월 대비</span>
              </span>
            )}
          </div>
        </div>
        <div className="stat-card cumulative-card">
          <div className="stat-icon">👤</div>
          <div className="stat-value">{fmtInt(cumulative.totalVisitors)}</div>
          <div className="stat-label">누적 순방문자수 ({cumulative.year}년)</div>
          <div className="cumulative-bottom">
            {cumulative.visitorsSparkline.length > 1 && <Sparkline values={cumulative.visitorsSparkline} color={SERIES_VISITORS} />}
            {cumulative.momVisitorsPct != null && (
              <span className={`stat-delta ${cumulative.momVisitorsPct >= 0 ? 'up' : 'down'}`}>
                {cumulative.momVisitorsPct >= 0 ? '▲' : '▼'} {Math.abs(cumulative.momVisitorsPct)}% <span className="muted">전월 대비</span>
              </span>
            )}
          </div>
        </div>
        <div className="stat-card cumulative-card ai-card">
          <div className="stat-icon">🤖</div>
          {ai.value != null ? (
            <>
              <div className="stat-value">{ai.value}</div>
              <div className="stat-label">AI 브리핑 인용수 (누적)</div>
              <div className="ai-sub">
                누적 <b>{ai.cumulative ?? '-'}</b>
              </div>
            </>
          ) : (
            <>
              <div className="stat-value">{ai.cumulative ?? '-'}</div>
              <div className="stat-label">AI 브리핑 인용수 (누적)</div>
              <div className="ai-pending">📡 데이터 수집 예정</div>
            </>
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
              <div className="mover-title">{latest.label} 급성장 게시물</div>
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
        </div>
      </div>

      <div className="headline-banner">
        <button type="button" className="headline-top-row" onClick={() => onSelect(latest.key)}>
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
          <ul className="headline-bullets">
            {secondaryInsights.map((s) => (
              <li key={s.type}>
                <b>{s.title}</b>: {s.detail} <span className="muted">— {s.note}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {categoryMix.length > 0 && (
        <div className="section-block">
          <h2 className="section-title">{latest.label} 인기글 주제 비중 (TOP10 기준)</h2>
          <p className="section-sub">인기 게시글 제목을 카테고리명과 대조해 자동으로 추정한 비중입니다</p>
          <div className="card">
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
            <p className="topic-mix-caption">※ 게시물과 카테고리를 직접 잇는 데이터가 없어, 제목 텍스트 기반으로 추정한 값입니다 (참고용).</p>
          </div>
        </div>
      )}

      <div className="section-block">
        <h2 className="section-title">역대 인기 게시물 TOP10</h2>
        <p className="section-sub">전체 기간 통틀어 가장 많이 읽힌 글 top10입니다 (클릭하면 게시물로 바로 이동합니다)</p>
        <div className="overview-post-list">
          {topPosts.map((p, i) =>
            p.url ? (
              <a className="overview-post-card" key={`${p.monthKey}-${p.title}`} href={p.url} target="_blank" rel="noopener noreferrer">
                <div className="overview-post-rank">{i + 1}</div>
                <div className="overview-post-body">
                  <div className="overview-post-title">
                    {p.title} <span className="link-ico">🔗</span>
                  </div>
                  <div className="overview-post-meta">
                    {p.monthLabel} · {fmtInt(p.views)}회
                  </div>
                </div>
              </a>
            ) : (
              <button type="button" className="overview-post-card" key={`${p.monthKey}-${p.title}`} onClick={() => onSelect(p.monthKey)}>
                <div className="overview-post-rank">{i + 1}</div>
                <div className="overview-post-body">
                  <div className="overview-post-title">{p.title}</div>
                  <div className="overview-post-meta">
                    {p.monthLabel} · {fmtInt(p.views)}회
                  </div>
                </div>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
