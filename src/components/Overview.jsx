import Sparkline from './Sparkline.jsx'
import TrendAreaChart from './TrendAreaChart.jsx'
import { SERIES_VIEWS, SERIES_VISITORS } from '../theme.js'

function fmtInt(n) {
  return typeof n === 'number' ? n.toLocaleString('ko-KR') : '-'
}

function DeltaChip({ field }) {
  if (!field.hasPrev) return <span className="stat2-delta none">전월 데이터 없음</span>
  if (field.dir == null) return <span className="stat2-delta none">전월과 동일</span>
  const arrow = field.dir === 'up' ? '▲' : '▼'
  return <span className={`stat2-delta ${field.dir}`}>{arrow} {field.delta}</span>
}

/** "홈" 화면: 달별 페이지를 축소 복제한 게 아니라, "이번 달 현황"(최신 달의 실제 KPI를 새로운
 *  카드 형태로) + "여러 달 비교"(달별 페이지에는 없는, 6개월 이상 전체 추이) + "역대 인기 게시물"
 *  (전체 기간 통틀어 top3, TOP10 반복 아님)로 구성한다. 버블차트나 유입경로/검색어 표는 여기서
 *  다루지 않고 달별 페이지에서만 확인한다.
 *  overview(=parseExcel.js computeOverview)와 months/trend는 전부 이미 파싱된 값을 그대로 쓰고,
 *  여기서 숫자를 새로 만들지 않는다. */
export default function Overview({ overview, months, trend, onSelect }) {
  if (!overview || !months || months.length === 0) return null
  const latest = months[months.length - 1]
  const { topPosts, risingPosts } = overview

  // 스파크라인은 실제로 과거 추이가 존재하는 조회수·순방문자수에만 붙인다 (방문횟수·재방문율·
  // 평균사용시간은 엑셀에 과거 추이 자체가 없어서 만들 수 없음).
  const viewsSeries = (trend || []).map((t) => t.views)
  const visitorsSeries = (trend || []).map((t) => t.visitors)

  const statCards = [
    { icon: '👁', label: '조회수', field: latest.kpi.views, sparkline: viewsSeries, color: SERIES_VIEWS, format: fmtInt },
    { icon: '👤', label: '순방문자수', field: latest.kpi.visitors, sparkline: visitorsSeries, color: SERIES_VISITORS, format: fmtInt },
    { icon: '🔁', label: '방문횟수', field: latest.kpi.visits, sparkline: null, format: fmtInt },
    { icon: '⟳', label: '재방문율', field: latest.kpi.revisit, sparkline: null, format: (v) => (v != null ? `${v.toFixed(2)}%` : '-') },
    { icon: '⏱', label: '평균 사용시간', field: latest.kpi.avgtime, sparkline: null, format: (v) => v ?? '-' },
  ]

  return (
    <div className="overview">
      <div className="section-block">
        <div className="section-head">
          <span className="badge">01</span>
          <h2 className="section-title">이번 달 현황</h2>
        </div>
        <p className="section-sub">
          {latest.label} · {latest.period} — 카드를 클릭하면 이 달의 전체 리포트로 이동합니다
        </p>
        <div className="stat2-row">
          {statCards.map((c) => (
            <button type="button" className="stat2-card" key={c.label} onClick={() => onSelect(latest.key)}>
              <div className="stat2-top">
                <span className="stat2-icon">{c.icon}</span>
                {c.sparkline && c.sparkline.length > 1 && <Sparkline values={c.sparkline} color={c.color} />}
              </div>
              <div className="stat2-value">{c.format(c.field.value)}</div>
              <div className="stat2-label">{c.label}</div>
              <DeltaChip field={c.field} />
            </button>
          ))}
        </div>
      </div>

      <div className="section-block">
        <div className="section-head">
          <span className="badge">02</span>
          <h2 className="section-title">월별 추이 비교</h2>
        </div>
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
          <div className="section-head">
            <span className="badge">★</span>
            <h2 className="section-title">역대 인기 게시물</h2>
          </div>
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
          <div className="section-head">
            <span className="badge">🔥</span>
            <h2 className="section-title">이번 달 신규 진입 게시물</h2>
          </div>
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
