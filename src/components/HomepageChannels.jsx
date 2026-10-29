// 홈페이지(GA4) 유입 채널 표: 채널별 활성 사용자·조회수·조회수 비중.
// 월별 상세 페이지의 "사용자 분석"(전체 표)과 홈 화면 오른쪽 카드(compact: 좁아서 채널별 사용자 열 생략)에서
// 같이 쓴다. 값은 buildHomepage()가 만든 그대로.
const CHANNEL_COLORS = {
  Direct: '#B7B9C4',
  'Organic Search': '#6C5CE0',
  Referral: '#17B8A6',
  'AI Assistant': '#F2A93B',
  Unassigned: '#D6D8E2',
  기타: '#E3E4EC',
}

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString('ko-KR') : '-'
}

export default function HomepageChannels({ ga, compact = false }) {
  if (!ga) return null
  const max = Math.max(...ga.channels.map((c) => c.views), 1)
  return (
    <div className={`hp-channels${compact ? ' compact' : ''}`}>
      <div className="hp-summary">
        <div>
          <div className="hp-sum-label">활성 사용자</div>
          <div className="hp-sum-value">{fmt(ga.users)}명</div>
        </div>
        <div>
          <div className="hp-sum-label">조회수</div>
          <div className="hp-sum-value">{fmt(ga.views)}건</div>
        </div>
      </div>
      <div className="hp-rows">
        {!compact && (
          <div className="hp-row hp-head">
            <span className="hp-name">채널</span>
            <span className="hp-bar" />
            <span className="hp-users">활성 사용자</span>
            <span className="hp-views">조회수</span>
            <span className="hp-pct">비중</span>
          </div>
        )}
        {ga.channels.map((c) => (
          <div className="hp-row" key={c.name}>
            <span className="hp-name">
              <i style={{ background: CHANNEL_COLORS[c.name] ?? '#B7B9C4' }} />
              {c.name}
            </span>
            <span className="hp-bar">
              <span style={{ width: `${(c.views / max) * 100}%`, background: CHANNEL_COLORS[c.name] ?? '#B7B9C4' }} />
            </span>
            {!compact && <span className="hp-users">{fmt(c.users)}</span>}
            <span className="hp-views">{fmt(c.views)}</span>
            <span className="hp-pct">{c.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <p className="hp-cap">
        {compact
          ? '※ 조회수 기준 비중입니다.'
          : '※ 한 사람이 여러 채널로 들어오면 채널별 활성 사용자는 중복 집계되어 합계와 다를 수 있습니다. 비중은 조회수 기준입니다.'}
      </p>
    </div>
  )
}
