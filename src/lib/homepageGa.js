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
