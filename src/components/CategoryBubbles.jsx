import { useMemo } from 'react'
import { forceSimulation, forceManyBody, forceCenter, forceCollide, forceLink, forceX, forceY } from 'd3-force'
import { SECTION_ORDER, sectionColorVar } from '../theme.js'
import { PERSON_WATCHLIST } from '../lib/parseExcel.js'

const W = 900
const MARGIN = 40

function estimateTagSize(text) {
  const w = Math.max(46, text.length * 6.6 + 20)
  const h = 24
  return { w, h }
}

/** 겹치는 노드 쌍을 반복적으로 밀어내는 후처리 (force 시뮬레이션 뒤, 뷰박스 clamp 뒤 각각 실행) */
function resolveOverlaps(nodes, iterations, boundW, boundH, margin) {
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        let dist = Math.hypot(dx, dy)
        const minDist = a.r + b.r + 10
        if (dist < minDist) {
          moved = true
          if (dist < 0.01) dist = 0.01
          const overlap = minDist - dist
          const ux = dx / dist
          const uy = dy / dist
          const half = overlap / 2
          a.x -= ux * half
          a.y -= uy * half
          b.x += ux * half
          b.y += uy * half
          if (boundW && boundH) {
            a.x = Math.max(margin + a.r, Math.min(boundW - margin - a.r, a.x))
            a.y = Math.max(margin + a.r, Math.min(boundH - margin - a.r, a.y))
            b.x = Math.max(margin + b.r, Math.min(boundW - margin - b.r, b.x))
            b.y = Math.max(margin + b.r, Math.min(boundH - margin - b.r, b.y))
          }
        }
      }
    }
    if (!moved) break
  }
}

function polarPoint(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/** 카테고리(버블)의 섹션 비중(mix)을 파이 조각으로 그린다 */
function PieSlices({ cx, cy, r, mix }) {
  let start = 0
  return (
    <>
      {mix.map((seg) => {
        const sweep = (seg.pct / 100) * 360
        const end = start + sweep
        const color = sectionColorVar(seg.section)
        let el
        if (sweep >= 359.999) {
          el = <circle key={seg.section} cx={cx} cy={cy} r={r} fill={color} />
        } else {
          const s = polarPoint(cx, cy, r, start)
          const e = polarPoint(cx, cy, r, end)
          const largeArc = sweep > 180 ? 1 : 0
          el = (
            <path
              key={seg.section}
              d={`M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y} Z`}
              fill={color}
            />
          )
        }
        start = end
        return el
      })}
    </>
  )
}

const normKey = (s) => String(s).toLowerCase().replace(/[.\s-]/g, '')
const isPersonName = (name) => PERSON_WATCHLIST.some((p) => normKey(name).includes(normKey(p)))

/** 브랜드/카테고리 버블 + 세부 키워드 태그를 d3-force로 배치하는 정적 마인드맵
 *  (참고 디자인 blog_dashboard_monthly_18.html의 renderBubbleChart 로직을 그대로 이식,
 *   드래그/편집/저장 등 상호작용만 제거한 정적 버전) */
function buildLayout(categories, people, H) {
  const nodes = []
  const links = []

  categories.forEach((c, i) => {
    nodes.push({ id: `b${i}`, type: 'bubble', name: c.name, count: c.total, section: c.section, mix: c.mix, r: c.r })
  })

  let anchorIdx = 0
  let maxR = -1
  categories.forEach((c, i) => {
    if (c.r > maxR) {
      maxR = c.r
      anchorIdx = i
    }
  })

  categories.forEach((c, i) => {
    c.keywords.forEach((k, j) => {
      const { w, h } = estimateTagSize(k.name)
      const id = `t${i}_${j}`
      nodes.push({ id, type: 'tag', text: k.name, w, h, r: Math.sqrt(w * w + h * h) / 2, parent: `b${i}` })
      links.push({ source: `b${i}`, target: id })
    })
  })

  people.forEach((p, i) => {
    const { w, h } = estimateTagSize(p.name)
    const id = `p${i}`
    nodes.push({ id, type: 'person', text: p.name, w, h, r: Math.sqrt(w * w + h * h) / 2, parent: `b${anchorIdx}` })
    links.push({ source: `b${anchorIdx}`, target: id })
  })

  // 초기 위치: 버블은 중앙 부근에 지터, 시뮬레이션이 나머지를 정리한다
  nodes.forEach((n) => {
    if (n.x == null) {
      n.x = W / 2 + (Math.random() - 0.5) * 300
      n.y = H / 2 + (Math.random() - 0.5) * 260
    }
  })

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const sim = forceSimulation(nodes)
    .force('charge', forceManyBody().strength(-55))
    .force('center', forceCenter(W / 2, H / 2))
    .force(
      'collide',
      forceCollide()
        .radius((d) => d.r + 12)
        .iterations(5)
    )
    .force(
      'link',
      forceLink(links)
        .id((d) => d.id)
        .distance((l) => {
          const s = byId.get(l.source.id || l.source)
          const t = byId.get(l.target.id || l.target)
          return (s ? s.r : 40) + (t ? t.r : 20) + 30
        })
        .strength(0.75)
    )
    .force('x', forceX(W / 2).strength(0.025))
    .force('y', forceY(H / 2).strength(0.025))
    .stop()

  for (let i = 0; i < 500; i++) sim.tick()

  // 노드가 많은(동점 연쇄로 카테고리가 늘어난) 달은 겹침 해소에 반복이 더 필요하다.
  const extraIters = Math.max(0, (nodes.length - 30) * 6)
  resolveOverlaps(nodes, 120 + extraIters)
  nodes.forEach((n) => {
    n.x = Math.max(MARGIN + n.r, Math.min(W - MARGIN - n.r, n.x))
    n.y = Math.max(MARGIN + n.r, Math.min(H - MARGIN - n.r, n.y))
  })
  resolveOverlaps(nodes, 60 + extraIters, W, H, MARGIN)

  const resolvedLinks = links.map((l) => ({
    source: byId.get(l.source.id || l.source),
    target: byId.get(l.target.id || l.target),
  }))

  return { nodes, links: resolvedLinks }
}

const isBrand = (name) => {
  const n = String(name).replace(/\s/g, '')
  return n === '디엠씨미디어' || n.toLowerCase().includes('dmc')
}

function BubbleMap({ categories, people }) {
  const maxTotal = Math.max(...categories.map((c) => c.total), 1)
  const minTotal = Math.min(...categories.map((c) => c.total), 0)
  const sized = categories.map((c) => {
    const t = maxTotal === minTotal ? 1 : (c.total - minTotal) / (maxTotal - minTotal)
    return { ...c, r: (110 + t * 130) / 2 }
  })

  // 브랜드(디엠씨미디어)는 실제 데이터상 언급 수가 1위가 아니어도 항상 가장 큰 원으로
  // 고정한다(확정된 디자인 규칙). 자연 1위였던 카테고리는 그다음 크기로 밀려난다.
  const brandIdx = sized.findIndex((c) => isBrand(c.name))
  if (brandIdx >= 0) {
    let maxIdx = 0
    sized.forEach((c, i) => {
      if (c.r > sized[maxIdx].r) maxIdx = i
    })
    if (maxIdx !== brandIdx) {
      const tmp = sized[brandIdx].r
      sized[brandIdx].r = sized[maxIdx].r
      sized[maxIdx].r = tmp
    }
  }

  // 카테고리·키워드가 많은 달(동점 연쇄로 top5보다 많아질 수 있음)은 캔버스를 더 넓게 써서
  // 태그가 지나치게 빽빽해지지 않도록 높이를 노드 수에 비례해 늘린다.
  const totalNodes = categories.length + categories.reduce((s, c) => s + c.keywords.length, 0) + people.length
  const H = Math.max(560, Math.min(1800, 320 + totalNodes * 14))

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { nodes, links } = useMemo(() => buildLayout(sized, people, H), [categories, people, H])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="카테고리 마인드맵">
      {links.map((l, i) => (
        <line
          key={i}
          className="kwd-link"
          x1={l.source.x}
          y1={l.source.y}
          x2={l.target.x}
          y2={l.target.y}
        />
      ))}

      {nodes
        .filter((n) => n.type !== 'bubble')
        .map((n) => {
          const person = n.type === 'person'
          return (
            <g key={n.id} className={`kwd-node-tag${person ? ' person' : ''}`} transform={`translate(${n.x},${n.y})`}>
              <rect x={-n.w / 2} y={-n.h / 2} width={n.w} height={n.h} rx={7} />
              <text x={0} y={4} textAnchor="middle">
                {n.text}
              </text>
            </g>
          )
        })}

      {nodes
        .filter((n) => n.type === 'bubble')
        .map((n) => {
          const fontSize = Math.max(11, n.r / 4.6)
          return (
            <g key={n.id} className="kwd-bubble-node">
              <PieSlices cx={n.x} cy={n.y} r={n.r} mix={n.mix} />
              <text x={n.x} y={n.y - 4} fontSize={fontSize} fontWeight="800">
                {n.name}
              </text>
              <text x={n.x} y={n.y + 14} fontSize={Math.max(9, fontSize * 0.6)} opacity="0.9">
                총 {n.count}회
              </text>
            </g>
          )
        })}
    </svg>
  )
}

export default function CategoryBubbles({ categories, people }) {
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
        <div className="item">
          <span className="swatch" style={{ background: '#FFE9C8', border: '1px solid #F0C888' }} />
          솔루션·인물
        </div>
      </div>

      <div className="bubble-map">
        <BubbleMap categories={categories} people={people ?? []} />
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
                    <span className={`kw-chip${isPersonName(k.name) ? ' person' : ''}`} key={k.name}>
                      {k.name}
                      <span className="chip-count">{k.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {people && people.length > 0 && (
          <div className="bubble-group">
            <div className="bubble-head">
              <div className="bubble-swatch" style={{ background: '#F0C888' }}>
                인물·솔루션
              </div>
            </div>
            <div className="kw-chip-row">
              {people.map((p) => (
                <span className="kw-chip person" key={p.name}>
                  {p.name}
                  <span className="chip-count">{p.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
