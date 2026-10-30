import { useEffect, useMemo, useState } from 'react'
import dashboardData from './data/dashboard-data.json'
import Sidebar from './components/Sidebar.jsx'
import Overview from './components/Overview.jsx'

// 사이드바는 "블로그 통계" / "홈페이지 통계" 두 페이지뿐이다. 월별 내용은 각 페이지 안에서 달을 골라 본다.
// 홈페이지 통계 페이지는 해시(#homepage)로 구분한다.
const HOMEPAGE_KEY = 'homepage'

// URL 해시로 페이지를 지정한다. 경로 방식(/blog-dashboard/2026-06)은 GitHub Pages가 정적 호스팅이라
// 새로고침 시 404가 나기 쉬운데, 해시는 서버에 요청을 보내지 않으므로 항상 안전하게 동작한다.
// 예전 월별 주소(#2026-06)는 블로그 통계 페이지에서 그 달을 선택한 상태로 연다.
function pageFromHash(months) {
  const raw = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''))
  if (raw === HOMEPAGE_KEY) return { page: 'homepage', monthKey: null }
  const monthKey = months.find((m) => m.key === raw)?.key ?? null
  return { page: 'blog', monthKey }
}

export default function App() {
  const { months, trend, sourceFile, overview, error, homepage = {}, homepageSummary = null } = dashboardData
  const [route, setRoute] = useState(() => pageFromHash(months))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const onHashChange = () => setRoute(pageFromHash(months))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [months])

  function goBlog() {
    setRoute({ page: 'blog', monthKey: null })
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  function goHomepage() {
    setRoute({ page: 'homepage', monthKey: null })
    window.history.replaceState(null, '', `#${HOMEPAGE_KEY}`)
  }

  const isHomepage = route.page === 'homepage'

  const navSections = useMemo(
    () => [
      {
        items: [
          { key: 'blog', label: '블로그 통계', icon: '🏠', active: !isHomepage, onClick: goBlog },
          { key: HOMEPAGE_KEY, label: '홈페이지 통계', icon: '🌐', active: isHomepage, onClick: goHomepage },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isHomepage]
  )

  if (error || months.length === 0) {
    return (
      <div className="app-shell">
        <div className="main-content">
          <div className="data-error">
            <p>{error ?? '표시할 데이터가 없습니다.'}</p>
            <p>
              프로젝트의 <code>data/</code> 폴더에 블로그 통계 엑셀(.xlsx) 파일을 넣고 개발 서버를
              다시 시작하거나 새로고침 해주세요.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const pageTitle = isHomepage ? '홈페이지 통계 보고서' : '블로그 통계 보고서'

  return (
    <div className="app-shell">
      <Sidebar sections={navSections} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((v) => !v)} />

      <div className="main-area">
        <div className="topbar topbar-hero">
          <div>
            <h1>{pageTitle}</h1>
          </div>
          {!isHomepage && (
            <a
              className="naver-badge"
              href="https://blog.naver.com/dmcmedia_official"
              target="_blank"
              rel="noopener noreferrer"
              title="네이버 블로그로 이동"
              aria-label="네이버 블로그로 이동"
            >
              N
            </a>
          )}
        </div>

        <div className="main-content">
          <p className="top-note">
            {isHomepage
              ? '데이터 출처: GA4 월별 수치 (data/homepage-ga.json, 직접 입력한 달 기준)'
              : `데이터 출처: ${sourceFile} (data/ 폴더에서 자동으로 읽어옵니다)`}
          </p>

          <Overview
            key={`${route.page}-${route.monthKey}`}
            overview={overview}
            months={months}
            trend={trend}
            homepage={homepage}
            homepageSummary={homepageSummary}
            view={isHomepage ? 'homepage' : 'blog'}
            initialMonthKey={route.monthKey}
          />
        </div>
      </div>
    </div>
  )
}
