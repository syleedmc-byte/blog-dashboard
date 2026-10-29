import { SERIES_VIEWS } from '../theme.js'
import { showTip, hideTip } from '../lib/tooltip.js'

// 인덱스 페이지 전용 월별 조회수 막대그래프.
// 홈페이지(GA) 수치가 있는 달이 하나라도 있으면 블로그·홈페이지를 나란히 그리고(비교 모드),
// 없으면 예전처럼 블로그 조회수만 그린다. 비교 모드에서 홈페이지 수치가 없는 달은 블로그 막대만 둔다.
const W = 640
const H = 220
const PAD_L = 40
const PAD_R = 16
const PAD_T = 22
const PAD_B = 26
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

export const BLOG_COLOR = '#6C5CE0'
export const HOMEPAGE_COLOR = '#17B8A6'

function fmt(n) {
  return n.toLocaleString('ko-KR')
}

export default function ViewsBarChart({ trend, homepage }) {
  if (!trend || trend.length === 0) return null

  const labels = trend.map((t) => t.label)
  const views = trend.map((t) => t.views)
  const hpViews = trend.map((t) => homepage?.[`${t.year}-${String(t.month).padStart(2, '0')}`]?.views ?? null)
  const compare = hpViews.some((v) => v != null)

  const maxVal = Math.max(...views, ...hpViews.filter((v) => v != null)) * 1.15
  const slot = PLOT_W / trend.length
  const xCenter = (i) => PAD_L + slot * i + slot / 2
  const yPos = (v) => PAD_T + PLOT_H - (v / maxVal) * PLOT_H
  const baselineY = PAD_T + PLOT_H

  const gridLines = [0, 1, 2, 3].map((g) => {
    const y = PAD_T + (PLOT_H / 3) * g
    return <line key={g} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--line)" strokeWidth="1" />
  })

  const monthLabels = labels.map((l, i) => (
    <text key={l} x={xCenter(i)} y={H - 8} fontSize="10" fill="var(--sub)" textAnchor="middle">
      {l.slice(5)}
    </text>
  ))

  if (!compare) {
    const avg = views.reduce((a, b) => a + b, 0) / views.length
    const barW = Math.min(38, slot * 0.56)
    const avgY = yPos(avg)
    return (
      <div style={{ width: '100%', height: 220 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
          {gridLines}
          <line x1={PAD_L} y1={avgY} x2={W - PAD_R} y2={avgY} stroke="var(--sub)" strokeWidth="1.2" strokeDasharray="4 4" />
          {monthLabels}
          {views.map((v, i) => (
            <rect
              key={i}
              x={xCenter(i) - barW / 2}
              y={yPos(v)}
              width={barW}
              height={baselineY - yPos(v)}
              rx={4}
              fill={SERIES_VIEWS}
              opacity={i === views.length - 1 ? 1 : 0.38}
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) => showTip(e, `조회수 ${labels[i]}: ${fmt(v)}`)}
              onMouseLeave={hideTip}
            />
          ))}
        </svg>
      </div>
    )
  }

  const barW = Math.min(26, slot * 0.34)
  const gap = 3
  return (
    <div style={{ width: '100%', height: 220 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        {gridLines}
        {[0, 1, 2, 3].map((g) => {
          const v = (maxVal / 3) * (3 - g)
          return (
            <text key={g} x={PAD_L - 6} y={PAD_T + (PLOT_H / 3) * g + 3} fontSize="9.5" fill="var(--sub)" textAnchor="end">
              {fmt(Math.round(v / 100) * 100)}
            </text>
          )
        })}
        {monthLabels}
        {views.map((v, i) => {
          const latest = i === views.length - 1
          const hp = hpViews[i]
          return (
            <g key={i}>
              <rect
                x={xCenter(i) - barW - gap / 2}
                y={yPos(v)}
                width={barW}
                height={baselineY - yPos(v)}
                rx={3}
                fill={BLOG_COLOR}
                opacity={latest ? 1 : 0.38}
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => showTip(e, `블로그 ${labels[i]}: ${fmt(v)}`)}
                onMouseLeave={hideTip}
              />
              <text x={xCenter(i) - barW / 2 - gap / 2} y={yPos(v) - 4} fontSize="9" fontWeight="700" fill={BLOG_COLOR} textAnchor="middle">
                {fmt(v)}
              </text>
              {hp != null && (
                <>
                  <rect
                    x={xCenter(i) + gap / 2}
                    y={yPos(hp)}
                    width={barW}
                    height={baselineY - yPos(hp)}
                    rx={3}
                    fill={HOMEPAGE_COLOR}
                    opacity={latest ? 1 : 0.38}
                    style={{ cursor: 'pointer' }}
                    onMouseMove={(e) => showTip(e, `홈페이지 ${labels[i]}: ${fmt(hp)}`)}
                    onMouseLeave={hideTip}
                  />
                  <text x={xCenter(i) + barW / 2 + gap / 2} y={yPos(hp) - 4} fontSize="9" fontWeight="700" fill="#0E8E7F" textAnchor="middle">
                    {fmt(hp)}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
