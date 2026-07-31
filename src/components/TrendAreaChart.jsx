import { SERIES_VIEWS, SERIES_VISITORS } from '../theme.js'
import { showTip, hideTip } from '../lib/tooltip.js'

// 홈 페이지 전용 — 달별 페이지의 TrendChart(직선 + 항상 보이는 숫자 라벨)와는 다른 형태로,
// 그라디언트 영역 채우기 + 호버 툴팁만 쓰는 좀 더 넓은 기간(여러 달)용 비교 그래프.
const W = 640
const H = 220
const PAD_L = 40
const PAD_R = 16
const PAD_T = 16
const PAD_B = 26
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

export default function TrendAreaChart({ trend }) {
  if (!trend || trend.length === 0) return null

  const labels = trend.map((t) => t.label)
  const views = trend.map((t) => t.views)
  const visitors = trend.map((t) => t.visitors)
  const maxVal = Math.max(...views, ...visitors) * 1.1

  const xPos = (i) => PAD_L + (trend.length === 1 ? 0 : (i / (trend.length - 1)) * PLOT_W)
  const yPos = (v) => PAD_T + PLOT_H - (v / maxVal) * PLOT_H
  const baselineY = PAD_T + PLOT_H

  const buildLine = (arr) => arr.map((v, i) => (i === 0 ? 'M' : 'L') + xPos(i).toFixed(1) + ',' + yPos(v).toFixed(1)).join(' ')
  const buildArea = (arr) => {
    let d = `M ${xPos(0).toFixed(1)},${baselineY}`
    arr.forEach((v, i) => {
      d += ` L ${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`
    })
    d += ` L ${xPos(arr.length - 1).toFixed(1)},${baselineY} Z`
    return d
  }

  const gridLines = [0, 1, 2, 3].map((g) => {
    const y = PAD_T + (PLOT_H / 3) * g
    return <line key={g} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--line)" strokeWidth="1" />
  })

  return (
    <div style={{ width: '100%', height: 220 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        <defs>
          <linearGradient id="overviewAreaViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES_VIEWS} stopOpacity="0.32" />
            <stop offset="100%" stopColor={SERIES_VIEWS} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="overviewAreaVisitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES_VISITORS} stopOpacity="0.32" />
            <stop offset="100%" stopColor={SERIES_VISITORS} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines}
        {labels.map((l, i) => (
          <text key={l} x={xPos(i)} y={H - 8} fontSize="10" fill="var(--sub)" textAnchor="middle">
            {l.slice(5)}
          </text>
        ))}
        <path d={buildArea(views)} fill="url(#overviewAreaViews)" />
        <path d={buildArea(visitors)} fill="url(#overviewAreaVisitors)" />
        <path d={buildLine(views)} fill="none" stroke={SERIES_VIEWS} strokeWidth="2.5" />
        <path d={buildLine(visitors)} fill="none" stroke={SERIES_VISITORS} strokeWidth="2.5" />
        {views.map((v, i) => (
          <circle
            key={'v' + i}
            cx={xPos(i)}
            cy={yPos(v)}
            r={3.5}
            fill={SERIES_VIEWS}
            style={{ cursor: 'pointer' }}
            onMouseMove={(e) => showTip(e, `조회수 ${labels[i]}: ${v.toLocaleString('ko-KR')}`)}
            onMouseLeave={hideTip}
          />
        ))}
        {visitors.map((v, i) => (
          <circle
            key={'p' + i}
            cx={xPos(i)}
            cy={yPos(v)}
            r={3.5}
            fill={SERIES_VISITORS}
            style={{ cursor: 'pointer' }}
            onMouseMove={(e) => showTip(e, `순방문자수 ${labels[i]}: ${v.toLocaleString('ko-KR')}`)}
            onMouseLeave={hideTip}
          />
        ))}
      </svg>
    </div>
  )
}
