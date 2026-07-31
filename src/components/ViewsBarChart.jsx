import { SERIES_VIEWS } from '../theme.js'
import { showTip, hideTip } from '../lib/tooltip.js'

// 인덱스 페이지 전용 — 참고 목업의 "Sales Report" 막대그래프를 조회수 하나만으로 재현한다.
// 평균선(참고 목업의 Median 라인)과 최신 달 강조 막대만 그 형태를 가져오고, 나머지는
// TrendAreaChart.jsx와 동일한 수제 SVG 방식을 그대로 따른다.
const W = 640
const H = 220
const PAD_L = 40
const PAD_R = 16
const PAD_T = 16
const PAD_B = 26
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

export default function ViewsBarChart({ trend }) {
  if (!trend || trend.length === 0) return null

  const labels = trend.map((t) => t.label)
  const views = trend.map((t) => t.views)
  const maxVal = Math.max(...views) * 1.15
  const avg = views.reduce((a, b) => a + b, 0) / views.length

  const slot = PLOT_W / trend.length
  const barW = Math.min(38, slot * 0.56)
  const xCenter = (i) => PAD_L + slot * i + slot / 2
  const yPos = (v) => PAD_T + PLOT_H - (v / maxVal) * PLOT_H
  const baselineY = PAD_T + PLOT_H

  const gridLines = [0, 1, 2, 3].map((g) => {
    const y = PAD_T + (PLOT_H / 3) * g
    return <line key={g} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--line)" strokeWidth="1" />
  })

  const avgY = yPos(avg)

  return (
    <div style={{ width: '100%', height: 220 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        {gridLines}
        <line x1={PAD_L} y1={avgY} x2={W - PAD_R} y2={avgY} stroke="var(--sub)" strokeWidth="1.2" strokeDasharray="4 4" />
        {labels.map((l, i) => (
          <text key={l} x={xCenter(i)} y={H - 8} fontSize="10" fill="var(--sub)" textAnchor="middle">
            {l.slice(5)}
          </text>
        ))}
        {views.map((v, i) => {
          const isLatest = i === views.length - 1
          const barH = baselineY - yPos(v)
          return (
            <rect
              key={i}
              x={xCenter(i) - barW / 2}
              y={yPos(v)}
              width={barW}
              height={barH}
              rx={4}
              fill={SERIES_VIEWS}
              opacity={isLatest ? 1 : 0.38}
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) => showTip(e, `조회수 ${labels[i]}: ${v.toLocaleString('ko-KR')}`)}
              onMouseLeave={hideTip}
            />
          )
        })}
      </svg>
    </div>
  )
}
