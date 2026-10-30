// 홈페이지 GA4 월별 수치(data/homepage-ga.json)를 대시보드용 구조로 바꾼다.
// 입력: { "2026-07": { users, views, channels: [{ name, users, views }, ...] }, ... }
// 출력: 같은 키의 { users, views, channels: [{ name, users, views, pct }] } — 채널은 조회수 큰 순,
//       AI Assistant는 작아도 항상 따로 보이게 두고, 그 외 작은 채널은 "기타"로 묶어 맨 뒤에 둔다.
const MAX_OTHER_ROWS = 4 // AI Assistant를 뺀 나머지 채널을 이 개수까지 따로 보여주고, 그 뒤는 "기타"
const PINNED = 'AI Assistant'

export function buildHomepage(raw) {
  const homepage = {}
  const warnings = []

  for (const [key, entry] of Object.entries(raw || {})) {
    if (key.startsWith('_')) continue // 설명용 항목
    if (!/^\d{4}-\d{2}$/.test(key) || !entry || !Array.isArray(entry.channels)) {
      warnings.push(`${key}: 형식이 맞지 않아 건너뜀 (연-월 키와 channels 배열이 필요)`)
      continue
    }

    const channels = entry.channels.map((c) => ({ name: String(c.name), users: Number(c.users) || 0, views: Number(c.views) || 0 }))
    const sumViews = channels.reduce((a, c) => a + c.views, 0)
    if (sumViews !== entry.views) {
      warnings.push(`${key}: 채널별 조회수 합(${sumViews})이 합계(${entry.views})와 다름 — 입력 오타를 확인하세요`)
    }

    const byViews = (a, b) => b.views - a.views
    const pinned = channels.filter((c) => c.name === PINNED)
    const rest = channels.filter((c) => c.name !== PINNED).sort(byViews)
    const shown = [...rest.slice(0, MAX_OTHER_ROWS), ...pinned].sort(byViews)
    const folded = rest.slice(MAX_OTHER_ROWS)
    if (folded.length > 0) {
      shown.push({
        name: '기타',
        users: folded.reduce((a, c) => a + c.users, 0),
        views: folded.reduce((a, c) => a + c.views, 0),
      })
    }

    homepage[key] = {
      users: entry.users,
      views: entry.views,
      channels: shown.map((c) => ({ ...c, pct: entry.views > 0 ? +((c.views / entry.views) * 100).toFixed(1) : 0 })),
    }
  }

  return { homepage, warnings }
}

const fmt = (n) => n.toLocaleString('ko-KR')
const monthLabel = (key) => `${Number(key.slice(5))}월`
// "2026-06" 다음 달 키인지(= 연속된 달인지) 확인
const isNextMonth = (a, b) => {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return by * 12 + bm - (ay * 12 + am) === 1
}

/** 홈 화면용 홈페이지 요약 — 누적(입력된 달 합계), 최신 월과 전월 대비, 자동 인사이트 문장.
 *  인사이트는 하드코딩 없이 입력된 수치에서 매번 다시 계산한다. */
export function summarizeHomepage(homepage) {
  const keys = Object.keys(homepage || {}).sort()
  if (keys.length === 0) return null

  const latestKey = keys[keys.length - 1]
  const latest = homepage[latestKey]
  const prevKey = keys.length >= 2 && isNextMonth(keys[keys.length - 2], latestKey) ? keys[keys.length - 2] : null
  const prev = prevKey ? homepage[prevKey] : null
  const pct = (a, b) => (b ? +(((a - b) / b) * 100).toFixed(1) : null)

  const insights = []

  // 1) 조회수가 같은 방향으로 몇 달 이어졌는지(연속된 달 기준), 없으면 전월 대비 변화
  if (prev) {
    let steps = 0
    let dir = null
    let startKey = latestKey
    for (let i = keys.length - 1; i > 0; i--) {
      if (!isNextMonth(keys[i - 1], keys[i])) break
      const diff = homepage[keys[i]].views - homepage[keys[i - 1]].views
      const d = diff > 0 ? 'up' : diff < 0 ? 'down' : null
      if (d == null) break
      if (dir == null) dir = d
      if (d !== dir) break
      steps++
      startKey = keys[i - 1]
    }
    if (dir && steps >= 2) {
      insights.push({
        title: `조회수 ${steps}개월 연속 ${dir === 'up' ? '증가' : '감소'}`,
        detail: `${monthLabel(startKey)} ${fmt(homepage[startKey].views)} → ${monthLabel(latestKey)} ${fmt(latest.views)}`,
        note: dir === 'up' ? '홈페이지 이용이 늘고 있습니다' : '유입이 줄고 있어 원인 점검이 필요합니다',
      })
    } else if (dir) {
      const p = pct(latest.views, prev.views)
      insights.push({
        title: `조회수 전월 대비 ${Math.abs(p)}% ${dir === 'up' ? '증가' : '감소'}`,
        detail: `${monthLabel(prevKey)} ${fmt(prev.views)} → ${monthLabel(latestKey)} ${fmt(latest.views)}`,
        note: dir === 'up' ? '직전 달보다 늘었습니다' : '직전 달보다 줄었습니다',
      })
    }

    // 2) 유입 채널 비중이 가장 크게 바뀐 채널(기타 제외)
    let best = null
    for (const c of latest.channels) {
      if (c.name === '기타') continue
      const before = prev.channels.find((x) => x.name === c.name)
      if (!before) continue
      const diff = +(c.pct - before.pct).toFixed(1)
      if (!best || Math.abs(diff) > Math.abs(best.diff)) best = { name: c.name, from: before.pct, to: c.pct, diff }
    }
    if (best && Math.abs(best.diff) >= 1) {
      insights.push({
        title: `${best.name} 유입 비중 ${best.diff > 0 ? '증가' : '감소'}`,
        detail: `${best.from}% → ${best.to}% (${best.diff > 0 ? '+' : ''}${best.diff}%p)`,
        note: '조회수 기준, 전월 대비 유입 구성이 가장 크게 바뀐 채널',
      })
    }
  }

  // 3) AI Assistant 유입이 있으면 참고로 함께 보여줌
  const ai = latest.channels.find((c) => c.name === 'AI Assistant')
  if (ai) {
    insights.push({
      title: 'AI Assistant 유입',
      detail: `조회수 ${fmt(ai.views)}건 (${ai.pct}%)`,
      note: 'AI 검색·답변을 통해 들어온 방문',
    })
  }

  return {
    count: keys.length,
    firstLabel: monthLabel(keys[0]),
    lastLabel: monthLabel(latestKey),
    totalViews: keys.reduce((a, k) => a + homepage[k].views, 0),
    latest: { label: monthLabel(latestKey), views: latest.views, users: latest.users },
    momViewsPct: prev ? pct(latest.views, prev.views) : null,
    momUsersPct: prev ? pct(latest.users, prev.users) : null,
    insights,
  }
}
