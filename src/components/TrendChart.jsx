import { SERIES_VIEWS, SERIES_VISITORS } from '../theme.js'
import { showTip, hideTip } from '../lib/tooltip.js'

// hand-drawn SVG line chart, ported from blog_dashboard_monthly_18.html's inline
// "line chart (svg)" block — straight segments + always-visible value labels near each
// point (not a smoothed curve / hover-only tooltip like a typical charting library gives).
const W = 320
const H = 220
const PAD_L = 34
const PAD_R = 10
const PAD_T = 16
const PAD_B = 26
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

export default function TrendChart({ trend }) {
  if (!trend || trend.length === 0) return null

  const months = trend.map((t) => t.label)
  const views = trend.map((t) => t.views)
  const visitors = trend.map((t) => t.visitors)
  const maxVal = Math.max(...views, ...visitors) * 1.08

  const xPos = (i) => PAD_L + (i / (months.length - 1)) * PLOT_W
  const yPos = (v) => PAD_T + PLOT_H - (v / maxVal) * PLOT_H
  const buildPath = (arr) => arr.map((v, i) => (i === 0 ? 'M' : 'L') + xPos(i).toFixed(1) + ',' + yPos(v).toFixed(1)).join(' ')

  const gridLines = [0, 1, 2, 3, 4].map((g) => {
    const y = PAD_T + (PLOT_H / 4) * g
    return <line key={g} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--line)" strokeWidth="1" />
  })

  return (
    <div style={{ width: '100%', height: 220 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        {gridLines}
        {months.map((m, i) => (
          <text key={m} x={xPos(i)} y={H - 6} fontSize="9" fill="var(--sub)" textAnchor="middle">
            {m.slice(5)}
          </text>
        ))}
        <path d={buildPath(views)} fill="none" stroke={SERIES_VIEWS} strokeWidth="2.5" />
        <path d={buildPath(visitors)} fill="none" stroke={SERIES_VISITORS} strokeWidth="2.5" />
        {views.map((v, i) => (
          <g key={'v' + i}>
            <circle
              cx={xPos(i)}
              cy={yPos(v)}
              r={4}
              fill={SERIES_VIEWS}
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) => showTip(e, `조회수 ${months[i]}: ${v.toLocaleString('ko-KR')}`)}
              onMouseLeave={hideTip}
            />
            <text x={xPos(i)} y={yPos(v) - 8} fontSize="10" fontWeight="700" fill={SERIES_VIEWS} textAnchor="middle">
              {v.toLocaleString('ko-KR')}
            </text>
          </g>
        ))}
        {visitors.map((v, i) => (
          <g key={'p' + i}>
            <circle
              cx={xPos(i)}
              cy={yPos(v)}
              r={4}
              fill={SERIES_VISITORS}
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) => showTip(e, `순방문자수 ${months[i]}: ${v.toLocaleString('ko-KR')}`)}
              onMouseLeave={hideTip}
            />
            <text x={xPos(i)} y={yPos(v) + 16} fontSize="10" fontWeight="700" fill={SERIES_VISITORS} textAnchor="middle">
              {v.toLocaleString('ko-KR')}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
