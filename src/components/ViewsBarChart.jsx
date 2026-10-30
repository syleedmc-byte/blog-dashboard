import { showTip, hideTip } from '../lib/tooltip.js'

// 홈 화면 "블로그" 구역 — 월별 블로그 조회수 막대그래프. 평균선(점선)과 최신 달 강조 막대를 둔다.
// 홈페이지 수치는 이 차트에 섞지 않고 HomepageTrendChart로 따로 그린다.
export const BLOG_COLOR = '#6C5CE0'

const W = 640
const H = 220
const PAD_L = 40
const PAD_R = 16
const PAD_T = 22
const PAD_B = 26
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

const fmt = (n) => n.toLocaleString('ko-KR')

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
  const avgY = yPos(avg)

  return (
    <div style={{ width: '100%', height: 220 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        {[0, 1, 2, 3].map((g) => {
          const y = PAD_T + (PLOT_H / 3) * g
          return <line key={g} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--line)" strokeWidth="1" />
        })}
        <line x1={PAD_L} y1={avgY} x2={W - PAD_R} y2={avgY} stroke="var(--sub)" strokeWidth="1.2" strokeDasharray="4 4" />
        {labels.map((l, i) => (
          <text key={l} x={xCenter(i)} y={H - 8} fontSize="10" fill="var(--sub)" textAnchor="middle">
            {Number(l.slice(5))}월
          </text>
        ))}
        {views.map((v, i) => (
          <g key={i}>
            <rect
              x={xCenter(i) - barW / 2}
              y={yPos(v)}
              width={barW}
              height={baselineY - yPos(v)}
              rx={4}
              fill={BLOG_COLOR}
              opacity={i === views.length - 1 ? 1 : 0.4}
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) => showTip(e, `${labels[i]} 블로그 조회수: ${fmt(v)}`)}
              onMouseLeave={hideTip}
            />
            <text x={xCenter(i)} y={yPos(v) - 5} fontSize="9.5" fontWeight="700" fill={BLOG_COLOR} textAnchor="middle">
              {fmt(v)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
