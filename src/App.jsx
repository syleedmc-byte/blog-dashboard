import { useMemo, useState } from 'react'
import dashboardData from './data/dashboard-data.json'
import MonthTabs from './components/MonthTabs.jsx'
import KpiCards from './components/KpiCards.jsx'
import TrendChart from './components/TrendChart.jsx'
import TopPosts from './components/TopPosts.jsx'
import ReferrerList from './components/ReferrerList.jsx'
import KeywordList from './components/KeywordList.jsx'
import DeviceDonut from './components/DeviceDonut.jsx'
import CategoryBubbles from './components/CategoryBubbles.jsx'
import { SERIES_VIEWS, SERIES_VISITORS } from './theme.js'

export default function App() {
  const { months, trend, sourceFile, error } = dashboardData
  const [activeKey, setActiveKey] = useState(months.length > 0 ? months[months.length - 1].key : null)

  const active = useMemo(() => months.find((m) => m.key === activeKey) ?? null, [months, activeKey])

  // 트렌드 차트는 참고 디자인과 동일하게, 해당 월을 기준으로 최근 5개월치만 보여준다
  // (트렌드 데이터 전체가 아니라 각 탭이 자기 자신을 끝점으로 하는 5개월 구간을 봐야 함)
  const activeTrend = useMemo(() => {
    if (!active || !trend) return trend
    const idx = trend.findIndex((t) => t.year === active.year && t.month === active.monthNumber)
    if (idx === -1) return trend
    return trend.slice(Math.max(0, idx - 4), idx + 1)
  }, [trend, active])

  if (error || months.length === 0) {
    return (
      <div className="app">
        <div className="data-error">
          <p>{error ?? '표시할 데이터가 없습니다.'}</p>
          <p>
            프로젝트의 <code>data/</code> 폴더에 블로그 통계 엑셀(.xlsx) 파일을 넣고 개발 서버를
            다시 시작하거나 새로고침 해주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <p className="top-note">데이터 출처: {sourceFile} (data/ 폴더에서 자동으로 읽어옵니다)</p>
      <MonthTabs months={months} active={activeKey} onSelect={setActiveKey} />

      <div className="header">
        <div>
          <h1>{active.label} 블로그 통계</h1>
          <p>블로그 운영 성과를 한눈에 확인하세요.</p>
        </div>
        <div className="year-pill">📅 {active.year}.{String(active.monthNumber).padStart(2, '0')}</div>
      </div>

      <div className="section-block">
        <div className="section-head">
          <span className="badge">01</span>
          <h2 className="section-title">주요 현황</h2>
        </div>
        <p className="section-sub">주요 지표로 보는 이달의 성과 &nbsp;|&nbsp; {active.period}</p>
        <KpiCards kpi={active.kpi} />
      </div>

      <div className="top-grid">
        <div>
          <div className="section-head">
            <span className="badge">02</span>
            <h2 className="section-title">월간 방문 분석</h2>
          </div>
          <p className="section-sub">조회수·순방문자수 추이를 확인합니다</p>
          <div className="card">
            <p className="subcard-title"><span className="accent-dot" />월간 조회수·순방문자수 추이</p>
            <div className="chart-legend">
              <div className="item"><span className="swatch" style={{ background: SERIES_VIEWS }} />조회수</div>
              <div className="item"><span className="swatch" style={{ background: SERIES_VISITORS }} />순방문자수</div>
            </div>
            <TrendChart trend={activeTrend} />
          </div>
        </div>
        <div>
          <div className="section-head">
            <span className="badge">★</span>
            <h2 className="section-title">인기 게시글 TOP 10</h2>
          </div>
          <p className="section-sub">이달 가장 많이 읽힌 글입니다</p>
          <div className="card">
            <TopPosts posts={active.posts} />
          </div>
        </div>
      </div>

      <div className="section-block">
        <div className="section-head">
          <span className="badge">03</span>
          <h2 className="section-title">사용자 분석</h2>
        </div>
        <p className="section-sub">방문자의 특성과 유입 경로를 확인합니다</p>
        <div className="user-grid">
          <div className="card">
            <p className="subcard-title"><span className="accent-dot" />유입 경로 분석 TOP 5</p>
            <ReferrerList items={active.referrers} />
          </div>
          <div className="card">
            <p className="subcard-title"><span className="accent-dot" />유입 검색어 TOP 5</p>
            <KeywordList items={active.keywords} />
          </div>
          <div className="card">
            <p className="subcard-title"><span className="accent-dot" />기기별 분포</p>
            <DeviceDonut device={active.device} />
          </div>
        </div>
      </div>

      <div className="section-block">
        <div className="section-head">
          <span className="badge">＋</span>
          <h2 className="section-title">{active.label} 유입 검색어 카테고리 TOP 5</h2>
        </div>
        <p className="section-sub">카테고리별 유입 키워드 빈도를 확인합니다 (원 크기는 유입 빈도에 비례, 동점 카테고리는 모두 표시)</p>
        <div className="card">
          <CategoryBubbles categories={active.categories} people={active.people} misc={active.misc} monthKey={active.key} />
        </div>
      </div>
    </div>
  )
}
