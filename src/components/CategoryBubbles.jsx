import { useEffect, useMemo, useRef, useState } from 'react'
import { SECTION_ORDER, sectionColorVar } from '../theme.js'
import { renderBubbleChart, addStandaloneTag, contrastTextColor, estimateCanvasSize } from '../lib/bubbleEngine.js'

const isBrand = (name) => {
  const n = String(name).replace(/\s/g, '')
  return n === '디엠씨미디어' || n.toLowerCase().includes('dmc')
}

/** categories/people (parseExcel.js 산출물) -> bubbleEngine이 기대하는 kd 모양으로 변환.
 *  브랜드(디엠씨미디어)가 실제 1위가 아니어도 항상 가장 큰 원으로 고정하는 규칙은 여기서 적용한다
 *  (확정된 디자인 규칙 — CategoryBubbles의 기존 정적 버전에 있던 로직 그대로 유지). */
function buildKd(categories, people, misc) {
  const maxTotal = Math.max(...categories.map((c) => c.total), 1)
  const minTotal = Math.min(...categories.map((c) => c.total), 0)
  const sized = categories.map((c) => {
    const t = maxTotal === minTotal ? 1 : (c.total - minTotal) / (maxTotal - minTotal)
    return { ...c, size: 110 + t * 130 }
  })

  // 브랜드(디엠씨미디어)만 항상 가장 큰 원으로 고정하고, 나머지는 모두 자기 자신의 실제 횟수에
  // 비례한 크기를 그대로 유지한다. (예전에는 브랜드와 1위 카테고리의 크기를 서로 바꿔치기했는데,
  // 그러면 1위 카테고리가 자기 횟수와 무관하게 브랜드의 원래 크기를 떠안는 부작용이 있었다.)
  const brandIdx = sized.findIndex((c) => isBrand(c.name))
  if (brandIdx >= 0) {
    const maxOtherSize = Math.max(0, ...sized.filter((_, i) => i !== brandIdx).map((c) => c.size))
    if (sized[brandIdx].size <= maxOtherSize) sized[brandIdx].size = maxOtherSize + 14
  }

  const bubbles = sized.map((c) => ({
    name: c.name,
    count: c.total,
    cat: c.section,
    size: c.size,
    mix: (c.mix || []).map((m) => ({ cat: m.section, pct: m.pct })),
    related: (c.keywords || []).map((k) => ({ name: k.name, section: k.section })),
  }))

  return {
    bubbles,
    people: (people || []).map((p) => ({ name: p.name, n: p.count })),
    // "기타"(미분류) 중 언급 많은 상위 몇 개는 어느 원에도 안 붙는 독립(하늘색) 태그로
    loose: misc || [],
  }
}

const COLOR_SWATCHES = [
  { bg: '#FFFFFF', border: '#ECEDF3', fg: '#1E2233', title: '기본(흰색)' },
  { bg: '#FFE9C8', border: '#F0C888', fg: '#8A5A17', title: '노랑 (인물·솔루션)' },
  { bg: '#E3F6FD', border: '#A9DFF0', fg: '#1E6E8C', title: '하늘색 (독립 키워드)' },
  { bg: '#E3F7E8', border: '#A6E0B4', fg: '#1B6B34', title: '초록' },
  { bg: '#FCE4EC', border: '#F5A8C4', fg: '#AD1457', title: '분홍' },
]

export default function CategoryBubbles({ categories, people, misc, monthKey }) {
  const svgRef = useRef(null)
  const [selectedColor, setSelectedColor] = useState(null) // null = 기본(흰색)
  const [selectedSwatchBg, setSelectedSwatchBg] = useState('#FFFFFF')
  const [addValue, setAddValue] = useState('')

  const kd = useMemo(() => buildKd(categories || [], people || [], misc || []), [categories, people, misc])
  const { W: canvasW, H: canvasH } = useMemo(() => estimateCanvasSize(kd), [kd])

  // 모바일(700px 이하)용 세로 목록: 디엠씨미디어를 항상 맨 위로, 그다음은 언급 많은 순
  // (categories는 이미 parseExcel에서 총 횟수 내림차순으로 정렬돼 오므로, 브랜드만 앞으로 빼면 됨)
  const mobileCategories = useMemo(() => {
    const cats = categories || []
    return [...cats.filter((c) => isBrand(c.name)), ...cats.filter((c) => !isBrand(c.name))]
  }, [categories])

  useEffect(() => {
    if (!svgRef.current) return
    let cleanup = null
    let cancelled = false
    renderBubbleChart(kd, svgRef.current, monthKey).then((fn) => {
      if (cancelled) fn && fn()
      else cleanup = fn
    })
    return () => {
      cancelled = true
      if (cleanup) cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey])

  if (!categories || categories.length === 0) {
    return <p style={{ color: 'var(--sub)', fontSize: 13 }}>표시할 카테고리 데이터가 없습니다.</p>
  }

  function handleAddTag() {
    const text = addValue.trim()
    if (!text || !svgRef.current) return
    addStandaloneTag(svgRef.current, text, selectedColor)
    setAddValue('')
  }

  return (
    <div data-bubble-panel="">
      <div className="kwd-legend">
        {SECTION_ORDER.map((s) => (
          <div className="item" key={s}>
            <span className="swatch" style={{ background: `var(--sec-${s.toLowerCase()})` }} />
            {s}
          </div>
        ))}
        <div className="item">
          <span className="swatch" style={{ background: '#FFE9C8', border: '1px solid #F0C888' }} />
          솔루션·인물
        </div>
      </div>

      <div className="kwd-add-row">
        <input
          type="text"
          className="kwd-add-input"
          placeholder="새 키워드 입력 후 추가 (독립 키워드로 생성, 이후 원으로 드래그해 연결 가능)"
          maxLength={30}
          value={addValue}
          onChange={(e) => setAddValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddTag()
            }
          }}
        />
        <div className="kwd-color-row" title="새 태그 색상 선택">
          {COLOR_SWATCHES.map((sw) => (
            <span
              key={sw.bg}
              className={`kwd-color-swatch${selectedSwatchBg === sw.bg ? ' selected' : ''}`}
              style={{ background: sw.bg }}
              title={sw.title}
              onClick={() => {
                setSelectedSwatchBg(sw.bg)
                setSelectedColor(sw.bg.toUpperCase() === '#FFFFFF' ? null : { bg: sw.bg, border: sw.border, fg: sw.fg })
              }}
            />
          ))}
          <input
            type="color"
            className="kwd-color-custom"
            defaultValue="#ffffff"
            title="커스텀 색상 선택"
            onChange={(e) => {
              const bg = e.target.value
              setSelectedSwatchBg(null)
              setSelectedColor({ bg, border: bg, fg: contrastTextColor(bg) })
            }}
          />
        </div>
        <button type="button" className="kwd-add-btn" onClick={handleAddTag}>
          + 태그 추가
        </button>
        <span className="kwd-sync-status" data-role="syncStatus" title="공유 저장소(Firebase) 연결 상태">
          ● 확인 중…
        </span>
      </div>

      <div className="kwd-chart-wrap">
        <svg ref={svgRef} viewBox={`0 0 ${canvasW} ${canvasH}`} width="100%" height={canvasH} role="img" aria-label="카테고리 마인드맵" />
      </div>

      <div className="bubble-mobile-list">
        {mobileCategories.map((c, i) => (
          <div className="bubble-mobile-card" key={c.name}>
            <div className="bubble-mobile-head">
              <span className="bubble-mobile-name">{c.name}</span>
              <span className="bubble-mobile-count">총 {c.total}회</span>
            </div>
            <div className="bubble-mobile-mix">
              {(c.mix || []).map((m) => (
                <span
                  key={m.section}
                  className="bubble-mobile-mix-seg"
                  style={{ width: `${m.pct}%`, background: sectionColorVar(m.section) }}
                  title={`${m.section} ${m.pct}%`}
                />
              ))}
            </div>
            <div className="bubble-mobile-tags">
              {(c.keywords || []).map((k) => (
                <span className="bubble-mobile-tag" key={k.name} style={{ borderColor: sectionColorVar(k.section) }}>
                  {k.name}
                </span>
              ))}
              {i === 0 &&
                (people || []).map((p) => (
                  <span className="bubble-mobile-tag person" key={p.name}>
                    {p.name}, {p.count}
                  </span>
                ))}
            </div>
          </div>
        ))}
        {(misc || []).length > 0 && (
          <div className="bubble-mobile-card standalone">
            <div className="bubble-mobile-head">
              <span className="bubble-mobile-name">독립 키워드</span>
            </div>
            <div className="bubble-mobile-tags">
              {misc.map((txt) => (
                <span className="bubble-mobile-tag standalone" key={txt}>
                  {txt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="kwd-desktop-note" style={{ fontSize: 11, color: 'var(--sub)', marginTop: 12 }}>
        ※ 원과 태그 크기는 유입 빈도에 비례합니다. <b>원/태그 드래그</b>로 위치 이동, <b>원 우측 하단 ✕ 핸들 드래그</b>로 크기 조절,{' '}
        <b>원이나 태그를 더블클릭하면 그 자리에서 바로 글씨를 입력·수정</b>할 수 있습니다 (Enter로 확정, Esc로 취소),{' '}
        <b>원 안의 &quot;총 N회&quot; 숫자를 더블클릭하면 횟수만 따로 수정</b>할 수 있습니다, <b>태그 좌측 상단 🎨를 클릭하면 색상 변경</b>,{' '}
        <b>태그를 원 가장자리 가까이에 드래그</b>하면 재연결·<b>원에서 충분히 멀리 드래그</b>하면 독립 키워드로 전환, 태그에 마우스를 올리고
        우측 상단 <b>빨간 ×</b>를 클릭하면 삭제됩니다. <b>수정한 내용은 저장되어, 이 링크를 여는 모두에게 그대로 보입니다.</b>
      </p>
    </div>
  )
}
