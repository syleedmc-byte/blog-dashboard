import { SECTION_ORDER, sectionColorVar } from '../theme.js'

const MIN_R = 30
const MAX_R = 58
const BRAND_R = 50

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

/** 브랜드(디엠씨미디어)를 중심에 두고 카테고리를 방사형으로 배치하는 정적 마인드맵 */
function BubbleMap({ categories }) {
  const n = categories.length
  const maxTotal = Math.max(...categories.map((c) => c.total), 1)
  const minTotal = Math.min(...categories.map((c) => c.total), 0)
  const maxR = n > 7 ? 46 : MAX_R
  const sizeFor = (total) => {
    const scale = maxTotal === minTotal ? 1 : (total - minTotal) / (maxTotal - minTotal)
    return MIN_R + scale * (maxR - MIN_R)
  }

  const width = 860
  const orbit = Math.min(300, 165 + n * 11)
  const cx = width / 2
  const cy = orbit + maxR + 46
  const height = cy + orbit + maxR + 46

  const nodes = categories.map((c, i) => {
    const angle = (360 / n) * i - (n % 2 === 0 ? 360 / n / 2 : 0)
    const pos = polar(cx, cy, orbit, angle)
    return { ...c, x: pos.x, y: pos.y, r: sizeFor(c.total) }
  })

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="카테고리 마인드맵">
      {nodes.map((nd) => (
        <line
          key={`line-${nd.name}`}
          x1={cx}
          y1={cy}
          x2={nd.x}
          y2={nd.y}
          stroke="var(--line)"
          strokeWidth={2}
        />
      ))}
      <circle cx={cx} cy={cy} r={BRAND_R} fill="var(--navy)" />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">
        디엠씨미디어
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fontSize="10" fill="#fff" opacity="0.75">
        DMC Media
      </text>
      {nodes.map((nd) => {
        const color = sectionColorVar(nd.section)
        const labelBelow = nd.y >= cy
        const labelY = labelBelow ? nd.y + nd.r + 16 : nd.y - nd.r - 22
        return (
          <g key={nd.name}>
            <circle cx={nd.x} cy={nd.y} r={nd.r} fill={color} />
            <text
              x={nd.x}
              y={nd.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.max(10, nd.r * 0.28)}
              fontWeight="800"
              fill="#fff"
            >
              총 {nd.total}회
            </text>
            <text x={nd.x} y={labelY} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="var(--ink)">
              {nd.name}
            </text>
            <text
              x={nd.x}
              y={labelY + (labelBelow ? 15 : -14)}
              textAnchor="middle"
              fontSize="10.5"
              fill="var(--sub)"
            >
              {nd.section ?? ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function CategoryBubbles({ categories }) {
  if (!categories || categories.length === 0) {
    return <p style={{ color: 'var(--sub)', fontSize: 13 }}>표시할 카테고리 데이터가 없습니다.</p>
  }

  return (
    <>
      <div className="kwd-legend">
        {SECTION_ORDER.map((s) => (
          <div className="item" key={s}>
            <span className="swatch" style={{ background: sectionColorVar(s) }} />
            {s}
          </div>
        ))}
      </div>

      <div className="bubble-map">
        <BubbleMap categories={categories} />
      </div>

      <div className="bubble-list">
        {categories.map((c) => {
          const color = sectionColorVar(c.section)
          return (
            <div className="bubble-group" key={c.name}>
              <div className="bubble-head">
                <div className="bubble-swatch" style={{ background: color }}>
                  총 {c.total}회
                </div>
                <div>
                  <span className="bubble-name">{c.name}</span>
                  <span className="bubble-count">{c.section ?? ''}</span>
                </div>
              </div>
              {c.keywords.length > 0 && (
                <div className="kw-chip-row">
                  {c.keywords.map((k) => (
                    <span className="kw-chip" key={k.name}>
                      {k.name}
                      <span className="chip-count">{k.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
