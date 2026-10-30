import { useMemo } from 'react'
import KpiCards from './KpiCards.jsx'
import TrendChart from './TrendChart.jsx'
import TopPosts from './TopPosts.jsx'
import ReferrerList from './ReferrerList.jsx'
import KeywordList from './KeywordList.jsx'
import DeviceDonut from './DeviceDonut.jsx'
import CategoryBubbles from './CategoryBubbles.jsx'
import { SERIES_VIEWS, SERIES_VISITORS } from '../theme.js'

/** 블로그 통계 페이지 안의 "월별 상세". 예전에는 월마다 별도 페이지였던 내용을 선택한 달 기준으로 보여준다.
 *  달은 맨 위의 월 버튼으로 고른다. */
export default function MonthDetail({ month, months, trend, onPick }) {
  // 트렌드 차트는 선택한 달을 끝점으로 하는 최근 5개월 구간만 보여준다
  const monthTrend = useMemo(() => {
    if (!trend) return trend
    const idx = trend.findIndex((t) => t.year === month.year && t.month === month.monthNumber)
    if (idx === -1) return trend
    return trend.slice(Math.max(0, idx - 4), idx + 1)
  }, [trend, month])

  return (
    <div className="month-detail" id="month-detail">
      <div className="month-picker" role="tablist" aria-label="월 선택">
        {months.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={m.key === month.key}
            className={`month-pick${m.key === month.key ? ' active' : ''}`}
            onClick={() => onPick(m.key)}
          >
            {m.monthNumber}월
          </button>
        ))}
      </div>

      <div className="month-detail-title">
        <h2>{month.label} 블로그 상세</h2>
        <p>{month.period} · 선택한 달 한 달 치 통계입니다</p>
      </div>

      <div className="month-detail-body">
      <div className="section-block">
        <div className="section-head">
          <span className="badge">01</span>
          <h2 className="section-title">블로그 주요 현황</h2>
        </div>
        <p className="section-sub">블로그 주요 지표로 보는 {month.label}의 성과 &nbsp;|&nbsp; {month.period}</p>
        <KpiCards kpi={month.kpi} />
      </div>

      <div className="top-grid">
        <div>
          <div className="section-head">
            <span className="badge">02</span>
            <h2 className="section-title">블로그 월간 방문 분석</h2>
          </div>
          <p className="section-sub">조회수·순방문자수 추이를 확인합니다</p>
          <div className="card">
            <p className="subcard-title"><span className="accent-dot" />월간 조회수·순방문자수 추이</p>
            <div className="chart-legend">
              <div className="item"><span className="swatch" style={{ background: SERIES_VIEWS }} />조회수</div>
              <div className="item"><span className="swatch" style={{ background: SERIES_VISITORS }} />순방문자수</div>
            </div>
            <TrendChart trend={monthTrend} />
          </div>
        </div>
        <div>
          <div className="section-head">
            <span className="badge">★</span>
            <h2 className="section-title">블로그 인기 게시글 TOP 10</h2>
          </div>
          <p className="section-sub">{month.label} 가장 많이 읽힌 글입니다</p>
          <div className="card">
            <TopPosts posts={month.posts} />
          </div>
        </div>
      </div>

      <div className="section-block">
        <div className="section-head">
          <span className="badge">03</span>
          <h2 className="section-title">블로그 사용자 분석</h2>
        </div>
        <p className="section-sub">블로그 방문자의 특성과 유입 경로를 확인합니다</p>
        <div className="user-grid">
          <div className="card">
            <p className="subcard-title"><span className="accent-dot" />유입 경로 분석 TOP 5</p>
            <ReferrerList items={month.referrers} />
          </div>
          <div className="card">
            <p className="subcard-title"><span className="accent-dot" />유입 검색어 TOP 5</p>
            <KeywordList items={month.keywords} />
          </div>
          <div className="card">
            <p className="subcard-title"><span className="accent-dot" />기기별 분포</p>
            <DeviceDonut device={month.device} />
          </div>
        </div>
      </div>

      <div className="section-block">
        <div className="section-head">
          <span className="badge">＋</span>
          <h2 className="section-title">{month.label} 유입 검색어 카테고리 TOP 5</h2>
        </div>
        <p className="section-sub">카테고리별 유입 키워드 빈도를 확인합니다 (원 크기는 유입 빈도에 비례, 동점 카테고리는 모두 표시)</p>
        <div className="card">
          <CategoryBubbles categories={month.categories} people={month.people} misc={month.misc} monthKey={month.key} />
        </div>
      </div>
      </div>
    </div>
  )
}
