import { showTip, hideTip } from '../lib/tooltip.js'

// 홈 화면 "홈페이지" 구역 전용 — 월별 조회수(PV)는 막대, 활성 사용자(UV)는 선으로 함께 그린다.
// homepage는 buildHomepage()가 만든 { '2026-07': { users, views, ... } } 맵이고, 수치를 입력한 달 중 최근 6개월만 쓴다.
export const PV_COLOR = '#17B8A6'
export const UV_COLOR = '#F2A93B'

const W = 640
const H = 230
const PAD_L = 44
const PAD_R = 16
const PAD_T = 22
const PAD_B = 26
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

const fmt = (n) => n.toLocaleString('ko-KR')

export default function HomepageTrendChart({ homepage }) {
  const keys = Object.keys(homepage || {}).sort().slice(-6)
  if (keys.length === 0) return null

  const rows = keys.map((k) => ({ label: `${Number(k.slice(5))}월`, pv: homepage[k].views, uv: homepage[k].users }))
  const maxVal = Math.max(...rows.map((r) => r.pv), ...rows.map((r) => r.uv)) * 1.15
  const slot = PLOT_W / rows.length
  const barW = Math.min(40, slot * 0.5)
  const xCenter = (i) => PAD_L + slot * i + slot / 2
  const yPos = (v) => PAD_T + PLOT_H - (v / maxVal) * PLOT_H
  const baselineY = PAD_T + PLOT_H
  const last = rows.length - 1

  return (
    <div style={{ width: '100%', height: H }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        {[0, 1, 2, 3].map((g) => {
          const y = PAD_T + (PLOT_H / 3) * g
          const v = (maxVal / 3) * (3 - g)
          return (
            <g key={g}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--line)" strokeWidth="1" />
              <text x={PAD_L - 6} y={y + 3} fontSize="9.5" fill="var(--sub)" textAnchor="end">
                {fmt(Math.round(v / 100) * 100)}
              </text>
            </g>
          )
        })}
        {rows.map((r, i) => (
          <g key={r.label}>
            <rect
              x={xCenter(i) - barW / 2}
              y={yPos(r.pv)}
              width={barW}
              height={baselineY - yPos(r.pv)}
              rx={4}
              fill={PV_COLOR}
              opacity={i === last ? 1 : 0.4}
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) => showTip(e, `${r.label} 조회수(PV): ${fmt(r.pv)}`)}
              onMouseLeave={hideTip}
            />
            <text x={xCenter(i)} y={yPos(r.pv) - 5} fontSize="9.5" fontWeight="700" fill="#0E8E7F" textAnchor="middle">
              {fmt(r.pv)}
            </text>
            <text x={xCenter(i)} y={H - 8} fontSize="10" fill="var(--sub)" textAnchor="middle">
              {r.label}
            </text>
          </g>
        ))}
        <polyline fill="none" stroke={UV_COLOR} strokeWidth="2.5" points={rows.map((r, i) => `${xCenter(i)},${yPos(r.uv)}`).join(' ')} />
        {rows.map((r, i) => (
          <g key={`uv-${r.label}`}>
            <circle
              cx={xCenter(i)}
              cy={yPos(r.uv)}
              r={4}
              fill={UV_COLOR}
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) => showTip(e, `${r.label} 활성 사용자(UV): ${fmt(r.uv)}`)}
              onMouseLeave={hideTip}
            />
            <text x={xCenter(i)} y={yPos(r.uv) - 9} fontSize="9.5" fontWeight="700" fill="#9A630F" stroke="#fff" strokeWidth="3" paintOrder="stroke" textAnchor="middle">
              {fmt(r.uv)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
