// Interactive category bubble map (drag to move, drag the handle to resize, double-click to
// edit, recolor/delete tags, add new standalone tags) — ported nearly verbatim from
// blog_dashboard_monthly_18.html's renderBubbleChart/bindBubbleEvents/enableDrag/redraw,
// adapted to: read section colors from this project's CSS variables (theme.js) instead of a
// fixed palette, and persist to a separate Firebase path so it never collides with the
// original reference site's saved layouts.
import { forceSimulation, forceManyBody, forceCenter, forceCollide, forceLink, forceX, forceY } from 'd3-force'
import { sectionColorVar } from '../theme.js'
import { showTip, hideTip } from './tooltip.js'

const FIREBASE_DB_URL = 'https://test-aee35-default-rtdb.firebaseio.com'
const BC_PATH_PREFIX = 'bubbleChartsVite' // separate namespace from the original site's "bubbleCharts/"

function bcStorageKey(monthKey) {
  return 'blogDashboardVite_bubbles_v1_' + monthKey
}
function bcFirebaseUrl(monthKey) {
  return `${FIREBASE_DB_URL}/${BC_PATH_PREFIX}/${encodeURIComponent(monthKey)}.json`
}

function setSyncStatus(svgEl, ok) {
  const panel = svgEl.closest('[data-bubble-panel]')
  if (!panel) return
  const el = panel.querySelector('[data-role="syncStatus"]')
  if (!el) return
  if (ok) {
    el.textContent = '● 연결됨'
    el.className = 'kwd-sync-status ok'
  } else {
    el.textContent = '● 연결 안 됨 (이 브라우저에만 저장됨 — 광고 차단 확장 프로그램을 꺼보세요)'
    el.className = 'kwd-sync-status offline'
  }
}

async function loadBCState(monthKey, svgEl) {
  const key = bcStorageKey(monthKey)
  try {
    const res = await fetch(bcFirebaseUrl(monthKey), { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      if (svgEl) setSyncStatus(svgEl, true)
      if (data && Array.isArray(data.nodes) && Array.isArray(data.links)) {
        try {
          localStorage.setItem(key, JSON.stringify(data))
        } catch (e) {
          /* private browsing etc. */
        }
        return data
      }
      if (data === null) return null
    } else if (svgEl) setSyncStatus(svgEl, false)
  } catch (e) {
    if (svgEl) setSyncStatus(svgEl, false)
  }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.links)) return null
    return parsed
  } catch (e) {
    return null
  }
}

async function persistBC(svgEl) {
  const state = svgEl._bc
  const monthKey = svgEl.dataset.monthKey
  if (!state || !monthKey) return
  const key = bcStorageKey(monthKey)
  const plainNodes = state.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    name: n.name,
    count: n.count,
    cat: n.cat,
    mix: n.mix,
    text: n.text,
    w: n.w,
    h: n.h,
    r: n.r,
    x: n.x,
    y: n.y,
    standalone: !!n.standalone,
    tagBg: n.tagBg,
    tagBorder: n.tagBorder,
    tagFg: n.tagFg,
  }))
  const plainLinks = state.links.map((l) => ({ source: l.source.id || l.source, target: l.target.id || l.target }))
  const payload = { nodes: plainNodes, links: plainLinks }
  const json = JSON.stringify(payload)
  try {
    localStorage.setItem(key, json)
  } catch (e) {
    /* private browsing etc. */
  }
  try {
    const res = await fetch(bcFirebaseUrl(monthKey), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true,
    })
    setSyncStatus(svgEl, res.ok)
  } catch (e) {
    setSyncStatus(svgEl, false)
  }
}

function estimateTagSize(text) {
  const w = Math.max(46, text.length * 6.6 + 20)
  const h = 24
  return { w, h }
}

function resolveOverlaps(nodes, iterations, boundW, boundH, margin, keepBubblesFixed) {
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
          const aFixed = !!keepBubblesFixed && a.type === 'bubble'
          const bFixed = !!keepBubblesFixed && b.type === 'bubble'
          if (aFixed && bFixed) {
            // both immovable — can't resolve this pair, leave as-is
          } else if (aFixed) {
            b.x += ux * overlap
            b.y += uy * overlap
          } else if (bFixed) {
            a.x -= ux * overlap
            a.y -= uy * overlap
          } else {
            const half = overlap / 2
            a.x -= ux * half
            a.y -= uy * half
            b.x += ux * half
            b.y += uy * half
          }
          if (boundW && boundH) {
            if (!aFixed) {
              a.x = Math.max(margin + a.r, Math.min(boundW - margin - a.r, a.x))
              a.y = Math.max(margin + a.r, Math.min(boundH - margin - a.r, a.y))
            }
            if (!bFixed) {
              b.x = Math.max(margin + b.r, Math.min(boundW - margin - b.r, b.x))
              b.y = Math.max(margin + b.r, Math.min(boundH - margin - b.r, b.y))
            }
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

function pieSlicesSvg(cx, cy, r, mix) {
  let start = 0
  let svg = ''
  mix.forEach((seg) => {
    const sweep = (seg.pct / 100) * 360
    const end = start + sweep
    const color = sectionColorVar(seg.cat)
    if (sweep >= 359.999) {
      svg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" style="fill:${color}"/>`
    } else {
      const s = polarPoint(cx, cy, r, start)
      const e = polarPoint(cx, cy, r, end)
      const largeArc = sweep > 180 ? 1 : 0
      svg += `<path d="M ${cx.toFixed(1)} ${cy.toFixed(1)} L ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArc} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)} Z" style="fill:${color}"/>`
    }
    start = end
  })
  return svg
}

function tagNodeSvg(n) {
  let cls = 'kwd-node-tag'
  if (n.type === 'person') cls += ' person'
  else if (n.standalone) cls += ' standalone'
  const dx = n.w / 2 - 2
  const dy = -n.h / 2 + 2
  const rdx = -n.w / 2 + 2
  const rdy = -n.h / 2 + 2
  const customStyle = n.tagBg ? ` style="fill:${n.tagBg};stroke:${n.tagBorder || n.tagBg};"` : ''
  const customTextStyle = n.tagFg ? ` style="fill:${n.tagFg};"` : ''
  return `<g class="${cls}" data-id="${n.id}" transform="translate(${n.x.toFixed(1)},${n.y.toFixed(1)})">
    <rect x="${-n.w / 2}" y="${-n.h / 2}" width="${n.w}" height="${n.h}" rx="7"${customStyle}/>
    <text x="0" y="4" text-anchor="middle"${customTextStyle}>${n.text}</text>
    <g class="kwd-tag-recolor" data-recolor="${n.id}" transform="translate(${rdx.toFixed(1)},${rdy.toFixed(1)})">
      <circle r="7"/>
      <text x="0" y="3" text-anchor="middle" style="font-size:8px;pointer-events:none;">🎨</text>
    </g>
    <g class="kwd-tag-delete" data-del="${n.id}" transform="translate(${dx.toFixed(1)},${dy.toFixed(1)})">
      <circle r="7"/>
      <text x="0" y="3" text-anchor="middle">×</text>
    </g>
  </g>`
}

export function contrastTextColor(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1E2233' : '#FFFFFF'
}

let _sharedColorInput = null
export function openColorPicker(initialHex, onPick) {
  if (!_sharedColorInput) {
    _sharedColorInput = document.createElement('input')
    _sharedColorInput.type = 'color'
    Object.assign(_sharedColorInput.style, { position: 'fixed', left: '-9999px', top: '-9999px', opacity: '0' })
    document.body.appendChild(_sharedColorInput)
  }
  _sharedColorInput.value = initialHex
  const handler = () => {
    onPick(_sharedColorInput.value)
  }
  _sharedColorInput.addEventListener('input', handler, { once: true })
  _sharedColorInput.click()
}

function svgPointToScreen(svgEl, x, y) {
  const ctm = svgEl.getScreenCTM()
  const pt = svgEl.createSVGPoint()
  pt.x = x
  pt.y = y
  const p = pt.matrixTransform(ctm)
  return { x: p.x, y: p.y, scale: ctm.a }
}

function startInlineEdit(svgEl, node, kind, onCommit) {
  const existing = document.querySelector('.kwd-inline-edit')
  if (existing) existing.blur()

  const editY = kind === 'count' ? node.y + 14 : node.y
  const { x: sx, y: sy, scale } = svgPointToScreen(svgEl, node.x, editY)
  const boxW = kind === 'count' ? Math.max(50, node.r * 0.9 * scale) : Math.max(60, (kind === 'bubble' ? node.r * 1.7 : node.w) * scale)
  const boxH = kind === 'count' ? Math.max(16, 15 * scale) : Math.max(20, (kind === 'bubble' ? 24 : node.h * 0.92) * scale)

  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'kwd-inline-edit'
  input.value = kind === 'bubble' ? node.name : kind === 'count' ? node.count : node.text
  input.maxLength = 40
  Object.assign(input.style, {
    position: 'fixed',
    left: sx - boxW / 2 + 'px',
    top: sy - boxH / 2 + 'px',
    width: boxW + 'px',
    height: boxH + 'px',
    fontSize: Math.max(10, (kind === 'count' ? 10 : 12) * scale) + 'px',
    lineHeight: boxH + 'px',
    zIndex: 9999,
  })
  document.body.appendChild(input)
  input.focus()
  input.select()

  let settled = false
  function finish(commit) {
    if (settled) return
    settled = true
    input.removeEventListener('blur', onBlur)
    const val = input.value.trim()
    input.remove()
    if (commit && val) onCommit(val)
  }
  function onBlur() {
    finish(true)
  }
  input.addEventListener('blur', onBlur)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      finish(true)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      finish(false)
    }
  })
}

function bindBubbleEvents(svgEl, nodes, byId, links, redrawFn) {
  svgEl.querySelectorAll('.kwd-bubble-node').forEach((g) => {
    g.addEventListener('mousemove', (e) => showTip(e, g.dataset.tip))
    g.addEventListener('mouseleave', hideTip)
    g.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      const id = g.dataset.id
      const n = byId[id]
      if (!n) return
      hideTip()
      if (e.target.classList && e.target.classList.contains('bubble-count-text')) {
        startInlineEdit(svgEl, n, 'count', (val) => {
          const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10)
          if (isNaN(num)) return
          n.count = num
          redrawFn(svgEl, nodes, byId, links)
          persistBC(svgEl)
        })
        return
      }
      startInlineEdit(svgEl, n, 'bubble', (val) => {
        n.name = val
        redrawFn(svgEl, nodes, byId, links)
        persistBC(svgEl)
      })
    })
  })
  svgEl.querySelectorAll('.kwd-node-tag').forEach((g) => {
    g.addEventListener('mousemove', (e) => {
      const n = byId[g.dataset.id]
      const tip = n && n.type === 'person' && n.count != null ? `${n.name} · ${n.count}회` : g.querySelector('text').textContent
      showTip(e, tip)
    })
    g.addEventListener('mouseleave', hideTip)
    g.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      const id = g.dataset.id
      const n = byId[id]
      if (!n) return
      hideTip()
      startInlineEdit(svgEl, n, 'tag', (val) => {
        n.text = val
        if (n.type === 'person') n.name = val
        const { w, h } = estimateTagSize(val)
        n.w = w
        n.h = h
        n.r = Math.sqrt(w * w + h * h) / 2
        redrawFn(svgEl, nodes, byId, links)
        persistBC(svgEl)
      })
    })
  })
  svgEl.querySelectorAll('.kwd-resize-handle').forEach((g) => {
    g.addEventListener('mousemove', (e) => showTip(e, '드래그해서 원 크기 조절'))
    g.addEventListener('mouseleave', hideTip)
  })
}

function redraw(svgEl, nodes, byId, links) {
  let svg = ''
  links.forEach((l) => {
    const s = byId[l.source.id || l.source]
    const t = byId[l.target.id || l.target]
    if (!s || !t) return
    svg += `<line class="kwd-link" x1="${s.x.toFixed(1)}" y1="${s.y.toFixed(1)}" x2="${t.x.toFixed(1)}" y2="${t.y.toFixed(1)}"/>`
  })
  nodes
    .filter((n) => n.type !== 'bubble')
    .forEach((n) => {
      svg += tagNodeSvg(n)
    })
  nodes
    .filter((n) => n.type === 'bubble')
    .forEach((n) => {
      const fontSize = Math.max(11, n.r / 4.6)
      const hx = n.x + n.r * 0.707
      const hy = n.y + n.r * 0.707
      svg += `<g class="kwd-bubble-node" data-id="${n.id}" data-tip="${n.name} · 총 ${n.count}회 · ${n.cat}">
      ${pieSlicesSvg(n.x, n.y, n.r, n.mix)}
      <text x="${n.x.toFixed(1)}" y="${(n.y - 4).toFixed(1)}" font-size="${fontSize.toFixed(1)}" font-weight="800">${n.name}</text>
      <text class="bubble-count-text" x="${n.x.toFixed(1)}" y="${(n.y + 14).toFixed(1)}" font-size="${Math.max(9, fontSize * 0.6).toFixed(1)}" opacity="0.9">총 ${n.count}회</text>
    </g>
    <g class="kwd-resize-handle" data-id="${n.id}">
      <circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="7"/>
      <path d="M ${(hx - 3).toFixed(1)} ${(hy - 3).toFixed(1)} L ${(hx + 3).toFixed(1)} ${(hy + 3).toFixed(1)} M ${(hx - 3).toFixed(1)} ${(hy + 3).toFixed(1)} L ${(hx + 3).toFixed(1)} ${(hy - 3).toFixed(1)}" stroke="#fff" stroke-width="1.4"/>
    </g>`
    })
  svgEl.innerHTML = svg
  bindBubbleEvents(svgEl, nodes, byId, links, redraw)
}

/** wires drag-to-move / drag-to-resize on the svg root; returns a cleanup function that
 *  removes the window-level mouseup listener (must be called from the React effect's
 *  cleanup, since this listener would otherwise leak/accumulate across re-renders) */
function enableDrag(svgEl, nodes, byId, links) {
  let mode = null // "move-bubble" | "move-tag" | "resize"
  let draggingId = null
  let lastPos = null
  let dragMoved = false
  const pt = svgEl.createSVGPoint()
  function toSvgCoords(evt) {
    pt.x = evt.clientX
    pt.y = evt.clientY
    const ctm = svgEl.getScreenCTM().inverse()
    const p = pt.matrixTransform(ctm)
    return { x: p.x, y: p.y }
  }
  function childrenOfBubble(bubbleId) {
    return links.filter((l) => (l.source.id || l.source) === bubbleId).map((l) => l.target.id || l.target)
  }

  function onMouseDown(e) {
    if (e.target.closest('.kwd-tag-delete')) return
    if (e.target.closest('.kwd-tag-recolor')) return
    dragMoved = false
    svgEl._interacting = true
    const handle = e.target.closest('.kwd-resize-handle')
    if (handle) {
      mode = 'resize'
      draggingId = handle.dataset.id
      lastPos = toSvgCoords(e)
      svgEl.style.cursor = 'nwse-resize'
      return
    }
    const tag = e.target.closest('.kwd-node-tag')
    if (tag) {
      mode = 'move-tag'
      draggingId = tag.dataset.id
      lastPos = toSvgCoords(e)
      svgEl.style.cursor = 'grabbing'
      return
    }
    const bubble = e.target.closest('.kwd-bubble-node')
    if (bubble) {
      mode = 'move-bubble'
      draggingId = bubble.dataset.id
      lastPos = toSvgCoords(e)
      svgEl.style.cursor = 'grabbing'
    }
  }

  function onClick(e) {
    const delBtn = e.target.closest('.kwd-tag-delete')
    if (delBtn) {
      const id = delBtn.dataset.del
      const idx = nodes.findIndex((n) => n.id === id)
      if (idx >= 0) nodes.splice(idx, 1)
      for (let i = links.length - 1; i >= 0; i--) {
        const l = links[i]
        if ((l.source.id || l.source) === id || (l.target.id || l.target) === id) links.splice(i, 1)
      }
      delete byId[id]
      hideTip()
      redraw(svgEl, nodes, byId, links)
      persistBC(svgEl)
      return
    }
    const recolorBtn = e.target.closest('.kwd-tag-recolor')
    if (recolorBtn) {
      const id = recolorBtn.dataset.recolor
      const n = byId[id]
      if (!n) return
      openColorPicker(n.tagBg || '#ffffff', (hex) => {
        n.tagBg = hex
        n.tagBorder = hex
        n.tagFg = contrastTextColor(hex)
        redraw(svgEl, nodes, byId, links)
        persistBC(svgEl)
      })
    }
  }

  function onMouseMove(e) {
    if (!draggingId) return
    const c = toSvgCoords(e)
    const n = byId[draggingId]

    if (mode === 'resize') {
      dragMoved = true
      const newR = Math.max(24, Math.min(170, Math.hypot(c.x - n.x, c.y - n.y)))
      const dr = newR - n.r
      n.r = newR
      childrenOfBubble(draggingId).forEach((childId) => {
        const child = byId[childId]
        if (!child) return
        const vx = child.x - n.x
        const vy = child.y - n.y
        const dist = Math.hypot(vx, vy) || 1
        child.x += (vx / dist) * dr
        child.y += (vy / dist) * dr
      })
      redraw(svgEl, nodes, byId, links)
      return
    }

    const dx = c.x - lastPos.x
    const dy = c.y - lastPos.y
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragMoved = true
    n.x += dx
    n.y += dy
    if (mode === 'move-bubble') {
      childrenOfBubble(draggingId).forEach((childId) => {
        const child = byId[childId]
        if (child) {
          child.x += dx
          child.y += dy
        }
      })
    }
    lastPos = c
    redraw(svgEl, nodes, byId, links)
  }

  function onWindowMouseUp() {
    if (mode === 'move-tag' && draggingId && dragMoved) {
      const tagNode = byId[draggingId]
      const existingLinkIdx = links.findIndex((l) => (l.target.id || l.target) === draggingId)
      const currentParentId = existingLinkIdx >= 0 ? links[existingLinkIdx].source.id || links[existingLinkIdx].source : null

      const ATTACH_PAD = 26
      let attachTarget = null
      let attachDist = Infinity
      nodes
        .filter((nn) => nn.type === 'bubble')
        .forEach((b) => {
          const dist = Math.hypot(b.x - tagNode.x, b.y - tagNode.y)
          if (dist < b.r + ATTACH_PAD && dist < attachDist) {
            attachTarget = b
            attachDist = dist
          }
        })

      if (attachTarget) {
        const isNewAttachment = currentParentId !== attachTarget.id
        if (existingLinkIdx >= 0) links[existingLinkIdx].source = attachTarget.id
        else links.push({ source: attachTarget.id, target: draggingId })
        tagNode.standalone = false
        if (isNewAttachment) {
          let angle = Math.atan2(tagNode.y - attachTarget.y, tagNode.x - attachTarget.x)
          if (!isFinite(angle)) angle = Math.random() * Math.PI * 2
          const dist = attachTarget.r + Math.max(tagNode.w, tagNode.h) / 2 + 16
          tagNode.x = attachTarget.x + Math.cos(angle) * dist
          tagNode.y = attachTarget.y + Math.sin(angle) * dist
        }
      } else if (currentParentId) {
        const parent = byId[currentParentId]
        const KEEP_PAD = 220
        const stillClose = parent && Math.hypot(parent.x - tagNode.x, parent.y - tagNode.y) < parent.r + KEEP_PAD
        if (!stillClose) {
          links.splice(existingLinkIdx, 1)
          tagNode.standalone = true
        }
      }
      redraw(svgEl, nodes, byId, links)
    }
    if (mode && dragMoved) persistBC(svgEl)
    mode = null
    draggingId = null
    dragMoved = false
    svgEl.style.cursor = 'default'
    setTimeout(() => {
      svgEl._interacting = false
    }, 1200)
  }

  svgEl.addEventListener('mousedown', onMouseDown)
  svgEl.addEventListener('click', onClick)
  svgEl.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onWindowMouseUp)

  return () => {
    svgEl.removeEventListener('mousedown', onMouseDown)
    svgEl.removeEventListener('click', onClick)
    svgEl.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onWindowMouseUp)
  }
}

/** builds the initial force-simulated layout for a month that has no saved state yet */
function buildFreshLayout(kd, W, H, margin) {
  const nodes = []
  const links = []

  kd.bubbles.forEach((b, i) => {
    nodes.push({
      id: 'b' + i,
      type: 'bubble',
      name: b.name,
      count: b.count,
      cat: b.cat,
      mix: b.mix || [{ cat: b.cat, pct: 100 }],
      r: b.size / 2,
      x: W / 2 + (Math.random() - 0.5) * 300,
      y: H / 2 + (Math.random() - 0.5) * 260,
    })
  })

  let anchorIdx = 0
  let maxR = -1
  kd.bubbles.forEach((b, i) => {
    if (b.size > maxR) {
      maxR = b.size
      anchorIdx = i
    }
  })

  kd.bubbles.forEach((b, i) => {
    ;(b.related || []).forEach((txt, j) => {
      const { w, h } = estimateTagSize(txt)
      const id = 't' + i + '_' + j
      nodes.push({ id, type: 'tag', text: txt, w, h, r: Math.sqrt(w * w + h * h) / 2, parent: 'b' + i })
      links.push({ source: 'b' + i, target: id })
    })
  })

  ;(kd.people || []).forEach((p, i) => {
    const { w, h } = estimateTagSize(p.name)
    const id = 'p' + i
    nodes.push({ id, type: 'person', name: p.name, count: p.n, text: p.name, w, h, r: Math.sqrt(w * w + h * h) / 2, parent: 'b' + anchorIdx })
    links.push({ source: 'b' + anchorIdx, target: id })
  })

  ;(kd.loose || []).forEach((txt, i) => {
    const { w, h } = estimateTagSize(txt)
    const id = 'l' + i
    nodes.push({
      id,
      type: 'tag',
      text: txt,
      w,
      h,
      r: Math.sqrt(w * w + h * h) / 2,
      parent: null,
      standalone: true,
      x: W / 2 + (Math.random() - 0.5) * 500,
      y: H / 2 + (Math.random() - 0.5) * 400,
    })
  })

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
          const s = nodes.find((n) => n.id === (l.source.id || l.source))
          const t = nodes.find((n) => n.id === (l.target.id || l.target))
          return (s ? s.r : 40) + (t ? t.r : 20) + 30
        })
        .strength(0.75)
    )
    .force('x', forceX(W / 2).strength(0.025))
    .force('y', forceY(H / 2).strength(0.025))
    .stop()

  for (let i = 0; i < 500; i++) sim.tick()

  resolveOverlaps(nodes, 120)
  nodes.forEach((n) => {
    n.x = Math.max(margin + n.r, Math.min(W - margin - n.r, n.x))
    n.y = Math.max(margin + n.r, Math.min(H - margin - n.r, n.y))
  })
  resolveOverlaps(nodes, 60, W, H, margin)

  const plainLinks = links.map((l) => ({ source: l.source.id || l.source, target: l.target.id || l.target }))
  return { nodes, links: plainLinks }
}

/** entry point: mounts (or loads the saved) bubble chart into svgEl.
 *  returns a cleanup function — call it from the React effect's cleanup. */
export async function renderBubbleChart(kd, svgEl, monthKey) {
  svgEl.dataset.monthKey = monthKey || ''
  const W = 900
  const H = 560
  const margin = 40
  let nodes = []
  let links = []

  const saved = monthKey ? await loadBCState(monthKey, svgEl) : null

  if (saved) {
    nodes = saved.nodes
    links = saved.links
  } else {
    ;({ nodes, links } = buildFreshLayout(kd, W, H, margin))
  }

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))

  redraw(svgEl, nodes, byId, links)
  const removeDragListeners = enableDrag(svgEl, nodes, byId, links)
  svgEl._bc = { nodes, links, byId, W, H, margin }

  return removeDragListeners
}

/** adds a brand-new, unconnected (standalone) keyword tag */
export function addStandaloneTag(svgEl, text, color) {
  const state = svgEl._bc
  if (!state) return
  const { nodes, links, byId, W, H, margin } = state
  const { w, h } = estimateTagSize(text)
  const id = 'u' + Date.now() + '_' + Math.floor(Math.random() * 1000)
  const node = {
    id,
    type: 'tag',
    text,
    w,
    h,
    r: Math.sqrt(w * w + h * h) / 2,
    parent: null,
    standalone: true,
    x: W / 2 + (Math.random() - 0.5) * 200,
    y: H / 2 + (Math.random() - 0.5) * 160,
  }
  if (color) {
    node.tagBg = color.bg
    node.tagBorder = color.border
    node.tagFg = color.fg
  }
  nodes.push(node)
  byId[id] = node
  resolveOverlaps(nodes, 100, W, H, margin, true)
  redraw(svgEl, nodes, byId, links)
  persistBC(svgEl)
}
