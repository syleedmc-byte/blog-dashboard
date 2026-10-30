import { useState } from 'react'
import MonthDetail from './MonthDetail.jsx'
import Sparkline from './Sparkline.jsx'
import ViewsBarChart, { BLOG_COLOR } from './ViewsBarChart.jsx'
import HomepageTrendChart, { PV_COLOR, UV_COLOR } from './HomepageTrendChart.jsx'
import HomepageChannels from './HomepageChannels.jsx'

function fmtInt(n) {
  return typeof n === 'number' ? n.toLocaleString('ko-KR') : '-'
}

/** 블로그 통계 / 홈페이지 통계 메인 페이지(view로 선택). 두 페이지는 사이드바에서 따로 연다.
 *  블로그: 누적 카드 → 월별 조회수 + 선택한 달 TOP5 → 통계 인사이트 → 인기 게시물 TOP10
 *  홈페이지: 누적 카드 → 월별 조회수(PV)·활성 사용자(UV) + 유입 채널 → 통계 인사이트
 *  여기서는 숫자를 새로 계산하지 않고 parseExcel.js/homepageGa.js가 만든 결과를 그대로 쓴다. */

function Delta({ pct }) {
  if (pct == null) return null
  return (
    <div className={`stat-delta ${pct >= 0 ? 'up' : 'down'}`}>
      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}% <span className="muted">전월 대비</span>
    </div>
  )
}

function SectionHead({ kind, title, period, action = null }) {
  return (
    <div className={`home-section-head ${kind}`}>
      <h2>{title}</h2>
      <span className="home-section-period">{period}</span>
      {action}
    </div>
  )
}

export default function Overview({ overview, months, trend, homepage = {}, homepageSummary = null, view = 'blog', initialMonthKey = null }) {
  // 블로그 페이지는 "통합 통계"와 "월별 상세" 두 탭으로 나뉜다. 월별 조회수 막대를 누르면 그 달 TOP5가 오른쪽 카드에 나오고,
  // 월별 상세 탭에서는 같은 달의 전체 통계를 본다. 예전 월별 주소(#2026-06)로 들어오면 월별 상세 탭이 열린다.
  const [pickedKey, setPickedKey] = useState(initialMonthKey)
  const [tab, setTab] = useState(initialMonthKey ? 'month' : 'total')
  const [hpPickedKey, setHpPickedKey] = useState(null)
  if (!overview || !months || months.length === 0) return null
  const latest = months[months.length - 1]
  const { topPosts, headline, secondaryInsights, topMover, cumulative } = overview
  const ai = latest.kpi.ai

  // 블로그 누적 기간 표시(예: 1월~9월): 같은 연도에서 합산에 쓰인 달
  const yearTrend = (trend ?? []).filter((t) => t.year === cumulative.year)
  const blogPeriod = yearTrend.length > 0 ? `${yearTrend[0].month}월~${yearTrend[yearTrend.length - 1].month}월` : ''
  const chartTrend = trend?.slice(-6) ?? []
  // 아무 달도 고르지 않았으면 가장 최근 달의 TOP5를 보여준다
  const activeKey = pickedKey ?? latest.key
  const pickedMonth = months.find((m) => m.key === activeKey) ?? latest
  const pickedPosts = (pickedMonth.posts ?? []).filter((p) => Number(p.rank) <= 5)
  const hasPickedViews = pickedPosts.some((p) => typeof p.views === 'number')
  const pickMonth = (key) => {
    if (months.some((m) => m.key === key)) setPickedKey(key)
  }
  // 게시물·인사이트·TOP5 카드에서 그 달로 이동: 달을 고르고 월별 상세 탭을 연다
  const openMonth = (key) => {
    pickMonth(key)
    setTab('month')
    setTimeout(() => document.getElementById('view-tabs')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  // 홈페이지(GA): 수치가 있는 가장 최근 달
  const hpKey = Object.keys(homepage).sort().pop()
  // 홈페이지 그래프에서 달을 누르면 그 달 유입 채널을 보여준다(고르지 않았으면 최근 달)
  const hpShownKey = hpPickedKey && homepage[hpPickedKey] ? hpPickedKey : hpKey
  const hpMonthLabel = hpShownKey ? `${Number(hpShownKey.slice(5))}월` : null

  return (
    <div className="overview">
      {/* ───────────── 블로그 ───────────── */}
      {view === 'blog' && (
        <div className="view-tabs" id="view-tabs" role="tablist" aria-label="블로그 통계 보기 방식">
          <button type="button" role="tab" aria-selected={tab === 'total'} className={`view-tab${tab === 'total' ? ' active' : ''}`} onClick={() => setTab('total')}>
            <span className="view-tab-title">📊 통합 통계</span>
            <span className="view-tab-sub">{cumulative.year}년 {blogPeriod} 전체를 한눈에</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'month'} className={`view-tab${tab === 'month' ? ' active' : ''}`} onClick={() => setTab('month')}>
            <span className="view-tab-title">📅 월별 상세</span>
            <span className="view-tab-sub">달을 골라 한 달 치 자세히 보기</span>
          </button>
        </div>
      )}

      {view === 'blog' && tab === 'month' && <MonthDetail month={pickedMonth} months={months} trend={trend} onPick={pickMonth} />}

      {view === 'blog' && tab === 'total' && (
      <section className="home-section">
        <SectionHead kind="blog" title="블로그 통합 통계" period={`${cumulative.year}년 ${blogPeriod} 누적`} />

        <div className="cumulative-row">
          <div className="stat-card cumulative-card icon-purple">
            <div className="cumulative-card-head">
              <div className="stat-icon">👁</div>
              <div className="cumulative-card-label">{cumulative.year}년 블로그 누적 조회수</div>
            </div>
            <div className="stat-value">{fmtInt(cumulative.totalViews)}건</div>
            <div className="cumulative-note">{latest.label} 조회수 {fmtInt(latest.kpi.views.raw)}건</div>
            <Delta pct={cumulative.momViewsPct} />
          </div>
          <div className="stat-card cumulative-card icon-purple">
            <div className="cumulative-card-head">
              <div className="stat-icon">👤</div>
              <div className="cumulative-card-label">{cumulative.year}년 블로그 누적 순방문자수</div>
            </div>
            <div className="stat-value">{fmtInt(cumulative.totalVisitors)}명</div>
            <div className="cumulative-note">{latest.label} 순방문자수 {fmtInt(latest.kpi.visitors.raw)}명</div>
            <Delta pct={cumulative.momVisitorsPct} />
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
              <>
                <div className="stat-value">{fmtInt(cumulative.aiCumulative)}회</div>
                <div className="cumulative-note">블로그 글이 AI 답변에 인용된 누적 횟수</div>
              </>
            )}
          </div>
        </div>

        <div className="chart-side-grid">
          <div className="card">
            <p className="subcard-title"><span className="accent-dot" />블로그 월별 조회수</p>
            <p className="section-sub">최근 6개월 블로그 조회수를 비교합니다. 막대를 누르면 그 달의 인기 게시글 TOP5가 오른쪽에 나오고, 그 달의 전체 통계는 위의 '월별 상세' 탭에서 볼 수 있습니다</p>
            <div className="chart-legend">
              <div className="item">
                <span className="swatch" style={{ background: BLOG_COLOR }} />
                블로그 조회수
              </div>
            </div>
            <ViewsBarChart trend={chartTrend} selectedKey={activeKey} onSelect={pickMonth} />
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

            {pickedMonth && (
              <div className="card month-top-card">
                <p className="subcard-title"><span className="accent-dot" />{pickedMonth.monthNumber}월 인기 게시글 TOP 5</p>
                {hasPickedViews ? (
                  <div className="month-top-list">
                    {pickedPosts.map((p) => {
                      const body = (
                        <>
                          <div className="ov-post-rank">{p.rank}</div>
                          <div className="ov-post-title">
                            {p.title}
                            {p.url && <span className="link-ico">🔗</span>}
                          </div>
                          <div className="ov-post-views">{fmtInt(p.views)}회</div>
                        </>
                      )
                      return p.url ? (
                        <a className="ov-post-row" key={`${p.rank}-${p.title}`} href={p.url} target="_blank" rel="noopener noreferrer">
                          {body}
                        </a>
                      ) : (
                        <div className="ov-post-row" key={`${p.rank}-${p.title}`}>
                          {body}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="topic-mix-caption">{pickedMonth.monthNumber}월은 게시글별 조회수 데이터가 없어 순위를 표시할 수 없습니다.</p>
                )}
                <p className="topic-mix-caption">※ 각 조회수는 {pickedMonth.monthNumber}월 한 달 동안 읽힌 횟수만 센 값입니다. 위 막대에서 다른 달을 누르면 그 달의 TOP 5로 바뀝니다.</p>
                <button type="button" className="month-open-btn" onClick={() => openMonth(pickedMonth.key)}>
                  📅 {pickedMonth.monthNumber}월 상세 통계 보기 →
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="headline-banner">
          <button type="button" className="headline-top-row" onClick={() => openMonth(latest.key)}>
            <div className="headline-left">
              <p className="headline-eyebrow">블로그 통계 인사이트</p>
              <p className="headline-sentence">{headline.sentence}</p>
            </div>
            <div className="headline-right">
              <div className="headline-metric-top">
                <span className="headline-metric-label">{headline.metricLabel}</span>
                {headline.sparkline && headline.sparkline.length > 1 && (
                  <Sparkline values={headline.sparkline} color={BLOG_COLOR} />
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
          <h3 className="section-title">역대 인기 게시물 TOP10</h3>
          <p className="section-sub">한 달 기준으로 가장 많이 읽힌 글 top10입니다. 조회수는 표시된 달에 읽힌 횟수만 센 값입니다 (클릭하면 게시물로 바로 이동합니다)</p>
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
                        <div className="ov-post-views">
                          {fmtInt(p.views)}회
                          <span className="ov-post-month">{p.monthLabel} 조회수</span>
                        </div>
                      </>
                    )
                    return p.url ? (
                      <a className="ov-post-row" key={`${p.monthKey}-${p.title}`} href={p.url} target="_blank" rel="noopener noreferrer">
                        {body}
                      </a>
                    ) : (
                      <button type="button" className="ov-post-row" key={`${p.monthKey}-${p.title}`} onClick={() => openMonth(p.monthKey)}>
                        {body}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ───────────── 홈페이지 ───────────── */}
      {view === 'homepage' && homepageSummary && hpKey && (
        <section className="home-section">
          <SectionHead
            kind="hp"
            title="홈페이지"
            period={`${homepageSummary.firstLabel}~${homepageSummary.lastLabel} 누적 (${homepageSummary.count}개월 · 수치를 입력한 달 기준)`}
          />

          <div className="cumulative-row">
            <div className="stat-card cumulative-card icon-teal">
              <div className="cumulative-card-head">
                <div className="stat-icon">🌐</div>
                <div className="cumulative-card-label">{hpKey.slice(0, 4)}년 홈페이지 누적 조회수(PV)</div>
              </div>
              <div className="stat-value">{fmtInt(homepageSummary.totalViews)}건</div>
              <div className="cumulative-note">{homepageSummary.latest.label} 조회수 {fmtInt(homepageSummary.latest.views)}건</div>
              <Delta pct={homepageSummary.momViewsPct} />
            </div>
            <div className="stat-card cumulative-card icon-teal">
              <div className="cumulative-card-head">
                <div className="stat-icon">🧑‍💻</div>
                <div className="cumulative-card-label">홈페이지 {homepageSummary.latest.label} 활성 사용자(UV)</div>
              </div>
              <div className="stat-value">{fmtInt(homepageSummary.latest.users)}명</div>
              <div className="cumulative-note">GA4 활성 사용자(월 단위)</div>
              <Delta pct={homepageSummary.momUsersPct} />
            </div>
            <div className="stat-card cumulative-card icon-teal">
              <div className="cumulative-card-head">
                <div className="stat-icon">🧭</div>
                <div className="cumulative-card-label">홈페이지 {homepageSummary.latest.label} 주요 유입</div>
              </div>
              <div className="stat-value">{homepage[hpKey].channels[0].name}</div>
              <div className="cumulative-note">조회수의 {homepage[hpKey].channels[0].pct}%</div>
            </div>
          </div>

          <div className="chart-side-grid">
            <div className="card">
              <p className="subcard-title"><span className="accent-dot" style={{ background: PV_COLOR }} />홈페이지 월별 조회수(PV)·활성 사용자(UV)</p>
              <p className="section-sub">최근 6개월 홈페이지 조회수는 막대, 활성 사용자는 선으로 함께 봅니다. 달을 누르면 그 달의 홈페이지 유입 채널이 오른쪽에 나옵니다</p>
              <div className="chart-legend">
                <div className="item">
                  <span className="swatch" style={{ background: PV_COLOR }} />
                  조회수(PV)
                </div>
                <div className="item">
                  <span className="swatch" style={{ background: UV_COLOR }} />
                  활성 사용자(UV)
                </div>
              </div>
              <HomepageTrendChart homepage={homepage} selectedKey={hpShownKey} onSelect={setHpPickedKey} />
            </div>

            <div className="side-stack">
              <div className="card">
                <p className="subcard-title"><span className="accent-dot" style={{ background: PV_COLOR }} />{hpMonthLabel} 홈페이지 유입 채널</p>
                <HomepageChannels ga={homepage[hpShownKey]} compact />
              </div>
            </div>
          </div>

          {homepageSummary.insights.length > 0 && (
            <div className="headline-banner hp-banner">
              <div className="headline-top-row static">
                <div className="headline-left">
                  <p className="headline-eyebrow">홈페이지 통계 인사이트</p>
                  <p className="headline-sentence">
                    {homepageSummary.insights[0].title} — {homepageSummary.insights[0].note}
                  </p>
                </div>
                <div className="headline-right">
                  <div className="headline-metric-top">
                    <span className="headline-metric-label">홈페이지 {homepageSummary.latest.label} 조회수</span>
                  </div>
                  <div className="headline-metric-value">{fmtInt(homepageSummary.latest.views)}</div>
                  <div className="headline-trend">{homepageSummary.insights[0].detail}</div>
                </div>
              </div>
              {homepageSummary.insights.length > 1 && (
                <ul className="headline-bullets">
                  {homepageSummary.insights.slice(1).map((s) => (
                    <li key={s.title}>
                      <b>{s.title}</b>: {s.detail} <span className="muted">— {s.note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
