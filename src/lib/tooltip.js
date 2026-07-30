// single shared floating tooltip, reused by the trend chart and the category bubble map
// (ported from blog_dashboard_monthly_18.html's showTip/hideTip)

let el = null

function ensure() {
  if (el) return el
  el = document.createElement('div')
  el.className = 'app-tooltip'
  document.body.appendChild(el)
  return el
}

export function showTip(e, text) {
  const t = ensure()
  t.textContent = text
  t.style.left = e.clientX + 12 + 'px'
  t.style.top = e.clientY + 12 + 'px'
  t.style.opacity = '1'
}

export function hideTip() {
  if (el) el.style.opacity = '0'
}
