import * as XLSX from 'xlsx'

// ---------------------------------------------------------------------------
// 엑셀을 "고정된 셀 주소"로 읽지 않고, 시트 안에 실제로 적혀 있는 표 제목 텍스트
// ("유입분석", "인기게시물 Top 10", "카테고리" 등)를 먼저 찾은 뒤 그 위치를 기준
// 으로 상대 좌표를 읽는다. 월마다 표 열 위치가 달라도(4월은 조회수 열 자체가
// 없음) 자동으로 맞춰 읽기 위함.
// ---------------------------------------------------------------------------

const noSpace = (v) => String(v ?? '').replace(/\s+/g, '')

const KEYWORD_SHEET_RE = /키워드분석[^\d]{0,3}(\d{1,2})월/
const CATEGORY_SHEET_RE = /카테고리분류[^\d]{0,3}(\d{1,2})월/

function extractMonthNumber(sheetName, re) {
  const m = noSpace(sheetName).match(re)
  return m ? parseInt(m[1], 10) : null
}

function sheetToGrid(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null })
}

function cell(grid, r, c) {
  if (r < 0 || r >= grid.length) return null
  const row = grid[r]
  if (!row || c < 0 || c >= row.length) return null
  const v = row[c]
  return v === undefined ? null : v
}

/** A1 스타일 셀 주소 문자열 생성 (하이퍼링크 조회용) */
function cellAddress(r, c) {
  return XLSX.utils.encode_cell({ r, c })
}

function findHeaderCell(grid, matcher, { maxRow = grid.length, maxCol = 40 } = {}) {
  for (let r = 0; r < Math.min(maxRow, grid.length); r++) {
    for (let c = 0; c < maxCol; c++) {
      const v = cell(grid, r, c)
      if (v == null) continue
      if (matcher(noSpace(v))) return { row: r, col: c }
    }
  }
  return null
}

/** 비율 값을 0~100 사이 퍼센트 숫자로 정규화 ('30.14%' 문자열, 0.3281 소수 둘 다 지원) */
function normalizePercent(v) {
  if (v == null) return null
  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (trimmed.endsWith('%')) {
      const n = parseFloat(trimmed)
      return Number.isNaN(n) ? null : n
    }
    const n = parseFloat(trimmed)
    return Number.isNaN(n) ? null : n * 100
  }
  if (typeof v === 'number') {
    return v > 1 ? v : v * 100
  }
  return null
}

const STAT_LABELS = [
  { key: 'views', label: '조회수' },
  { key: 'visitors', label: '순방문자수' },
  { key: 'visits', label: '방문횟수' },
  { key: 'revisit', label: '재방문율' },
  { key: 'avgtime', label: '평균사용시간' },
]

function parseStats(grid) {
  const stats = {}
  for (const { key, label } of STAT_LABELS) {
    const pos = findHeaderCell(grid, (t) => t === label, { maxRow: 15, maxCol: 6 })
    if (!pos) continue
    const raw = cell(grid, pos.row, pos.col + 1)
    stats[key] = key === 'revisit' ? normalizePercent(raw) : raw
  }
  return stats
}

/** "유입분석" 표: 이름/비율 2열 */
function parseReferrers(grid) {
  const header = findHeaderCell(grid, (t) => t === '유입분석', { maxRow: 6 })
  if (!header) return []
  const { row, col } = header
  const items = []
  for (let r = row + 1; r < row + 1 + 20; r++) {
    const name = cell(grid, r, col)
    if (name == null || name === '') break
    items.push({ name: String(name), pct: normalizePercent(cell(grid, r, col + 1)) })
  }
  return items
}

/** "유입 검색어" 표 */
function parseKeywords(grid) {
  const header = findHeaderCell(grid, (t) => t === '유입검색어', { maxRow: grid.length })
  if (!header) return []
  const { row, col } = header
  const items = []
  for (let r = row + 1; r < row + 1 + 30; r++) {
    const name = cell(grid, r, col)
    if (name == null || name === '') break
    items.push({ name: String(name), pct: normalizePercent(cell(grid, r, col + 1)) })
  }
  return items
}

/** "기기별 분포" 표: 모바일/PC 비율 */
function parseDevice(grid) {
  const header = findHeaderCell(grid, (t) => t === '기기별분포', { maxRow: grid.length })
  if (!header) return { mobile: null, pc: null }
  const { row, col } = header
  const device = { mobile: null, pc: null }
  for (let r = row + 1; r < row + 1 + 6; r++) {
    const name = cell(grid, r, col)
    if (name == null || name === '') break
    const pct = normalizePercent(cell(grid, r, col + 1))
    if (String(name).includes('모바일')) device.mobile = pct
    else if (noSpace(name).toUpperCase() === 'PC') device.pc = pct
  }
  return device
}

/**
 * "인기게시물 Top 10" 표: 순위 열은 제목 열 바로 왼쪽, 조회수 열은 헤더 행에서
 * "조회수" 텍스트로 찾는다 (달마다 조회수 열의 유무/위치가 다름). 제목 셀에
 * 하이퍼링크가 걸려 있으면 원문 URL도 함께 읽는다.
 */
function parsePosts(sheet, grid) {
  const header = findHeaderCell(grid, (t) => t.includes('인기게시물'), { maxRow: 6 })
  if (!header) return []
  const titleCol = header.col
  const rankCol = titleCol - 1

  let viewsCol = null
  for (let c = titleCol + 1; c <= titleCol + 6; c++) {
    const v = cell(grid, header.row, c)
    if (v != null && noSpace(v).includes('조회수')) {
      viewsCol = c
      break
    }
  }

  const posts = []
  for (let r = header.row + 1; r < header.row + 1 + 40; r++) {
    const rank = cell(grid, r, rankCol)
    if (rank == null || rank === '') break
    const titleCell = sheet[cellAddress(r, titleCol)]
    const title = cell(grid, r, titleCol) != null ? String(cell(grid, r, titleCol)) : ''
    posts.push({
      rank: Number(rank),
      title,
      views: viewsCol != null ? cell(grid, r, viewsCol) : null,
      url: titleCell && titleCell.l ? titleCell.l.Target : null,
    })
  }
  return posts
}

/** 연-월 라벨(예: "2026.06")을 {year, month} 형태로 정규화. 엑셀이 문자/숫자 어느 쪽으로
 * 저장했든(예: '2026.02' 문자열 또는 2026.05 float) 처리한다. */
function parseYearMonthLabel(v) {
  if (v == null) return null
  const s = typeof v === 'number' ? v.toFixed(2) : String(v).trim()
  const m = s.match(/^(\d{4})\.(\d{1,2})$/)
  if (!m) return null
  return { year: parseInt(m[1], 10), month: parseInt(m[2], 10), label: s }
}

/** "월간조회수 추이" / "월간 순방문자 추이" 표를 읽어 {year, month, views?, visitors?} 배열로 변환 */
function parseTrendTable(grid, headerMatcher) {
  const header = findHeaderCell(grid, headerMatcher, { maxRow: grid.length })
  if (!header) return []
  const { row, col } = header
  const items = []
  for (let r = row + 1; r < row + 1 + 24; r++) {
    const label = cell(grid, r, col)
    if (label == null || label === '') break
    const ym = parseYearMonthLabel(label)
    if (!ym) continue
    const value = cell(grid, r, col + 1)
    items.push({ ...ym, value: typeof value === 'number' ? value : Number(value) })
  }
  return items
}

/** "AI 브리핑 인용수" 표 (있는 달만 존재) */
function parseAi(grid) {
  const header = findHeaderCell(grid, (t) => t === 'AI브리핑인용수', { maxRow: grid.length })
  if (!header) return null
  const { row, col } = header
  let value = null
  let cumulative = null
  for (let r = row + 1; r < row + 1 + 6; r++) {
    const label = cell(grid, r, col)
    if (label == null) continue
    const v = cell(grid, r, col + 1)
    if (String(label).includes('합계')) cumulative = v
    else if (value == null) value = v
  }
  if (value == null && cumulative == null) return null
  return { value, cumulative }
}

function parseKeywordSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName]
  const grid = sheetToGrid(sheet)
  const monthNumber = extractMonthNumber(sheetName, KEYWORD_SHEET_RE)
  const stats = parseStats(grid)
  const viewsTrend = parseTrendTable(grid, (t) => t === '월간조회수추이')
  const visitorsTrend = parseTrendTable(grid, (t) => t === '월간순방문자추이')
  // 현재 월의 연-월은 각 추이 표의 마지막(가장 최근) 행 = 그 시트 자신의 값
  const selfYm = viewsTrend.length > 0 ? viewsTrend[viewsTrend.length - 1] : null

  return {
    monthNumber,
    year: selfYm ? selfYm.year : null,
    stats,
    referrers: parseReferrers(grid),
    keywords: parseKeywords(grid),
    device: parseDevice(grid),
    posts: parsePosts(sheet, grid),
    ai: parseAi(grid),
    viewsTrend,
    visitorsTrend,
  }
}

// 인물/솔루션 워치리스트: "카테고리 분류" 시트의 키워드 열에서 아래 이름을 찾아 노란색 태그로
// 뽑아낸다 (마침표/공백/대소문자 차이는 무시). 추적 대상이 늘어나면 이 배열에만 추가하면 된다.
export const PERSON_WATCHLIST = ['이준희', '이인성', 'D.SaiO', 'D.Frame', 'D.Metrics', 'D.Flow', 'theCAP']

const normKey = (s) => String(s).toLowerCase().replace(/[.\s-]/g, '')

// 같은 뜻인데 띄어쓰기/대소문자만 다른 키워드("타불라광고" vs "타불라 광고")를 한 항목으로
// 합친다. 표시 문구는 실제로 가장 많이 쓰인 표기를 쓰고(동점이면 더 짧은 쪽), 섹션은 그
// 문구가 가장 많이 속했던 섹션을 쓴다.
function addKeywordOccurrence(map, kw, count, section) {
  const key = normKey(kw)
  if (!map.has(key)) map.set(key, { count: 0, variants: new Map(), sectionCounts: new Map() })
  const entry = map.get(key)
  entry.count += count
  entry.variants.set(kw, (entry.variants.get(kw) || 0) + count)
  if (section) entry.sectionCounts.set(section, (entry.sectionCounts.get(section) || 0) + count)
}

function finalizeKeywordEntry(entry) {
  let bestText = null
  let bestTextCount = -1
  for (const [text, c] of entry.variants) {
    if (c > bestTextCount || (c === bestTextCount && text.length < bestText.length)) {
      bestText = text
      bestTextCount = c
    }
  }
  let bestSection = null
  let bestSectionCount = -1
  for (const [sec, c] of entry.sectionCounts) {
    if (c > bestSectionCount) {
      bestSection = sec
      bestSectionCount = c
    }
  }
  return { name: bestText, count: entry.count, section: bestSection }
}

/** 카테고리 분류 시트 파싱 (참고 디자인 blog_dashboard_monthly_18.html의 버블차트 로직과 동일):
 *  - "기타"(미분류 묶음)는 버블(원)로는 안 쓰고, 언급 많은 순 5개만 독립 태그로 뽑는다
 *  - 섹션은 다수결이 아니라 환산횟수 가중합으로 비중(mix)을 계산해 파이 조각으로 표시하고,
 *    그 비중(mix)의 합이 항상 100%가 되도록 섹션 있는 행만으로 나눈다(섹션 없는 행 때문에
 *    파이에 빈 칸이 생기지 않게)
 *  - TOP5, 5위가 동점이면 그 동점 그룹만 통째로 포함 (동점이 top5 경계에 걸릴 때만 확장)
 *  - 카테고리별 키워드는 언급 횟수 상위 5개 (그보다 적으면 있는 만큼만), 비슷한 표기는 합쳐서
 *    하나로 세고, 그 카테고리에 섹션이 2개 이상 섞여 있으면 각 섹션에서 최소 1개는 뽑는다
 *  - 인물/솔루션 워치리스트 언급 횟수는 카테고리와 무관하게 시트 전체에서 합산 */
function parseCategorySheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName]
  const grid = sheetToGrid(sheet)
  const header = findHeaderCell(grid, (t) => t === '카테고리', { maxRow: 3 })
  if (!header) return { categories: [], people: [], misc: [] }

  const colOf = (label) => {
    const pos = findHeaderCell(grid, (t) => t === label, { maxRow: header.row + 1 })
    return pos ? pos.col : null
  }
  const catCol = header.col
  const kwCol = colOf('키워드')
  const countCol = colOf('환산횟수')
  const sectionCol = colOf('섹션')

  const totals = new Map()
  const sectionTotals = new Map()
  const keywordTotals = new Map()
  const miscKeywords = new Map()
  const personNorm = PERSON_WATCHLIST.map((name) => ({ name, key: normKey(name) }))
  const personCounts = new Map(PERSON_WATCHLIST.map((name) => [name, 0]))

  for (let r = header.row + 1; r < grid.length; r++) {
    const cat = cell(grid, r, catCol)
    if (cat == null || cat === '') continue
    const count = Number(cell(grid, r, countCol)) || 0
    const section = sectionCol != null ? cell(grid, r, sectionCol) : null
    const kw = kwCol != null ? cell(grid, r, kwCol) : null

    if (String(cat).trim() === '기타') {
      if (kw) {
        const kwKey = normKey(kw)
        const isPersonMatch = personNorm.some((p) => kwKey.includes(p.key))
        if (!isPersonMatch) addKeywordOccurrence(miscKeywords, kw, count, section)
      }
      continue
    }

    totals.set(cat, (totals.get(cat) || 0) + count)
    if (section) {
      if (!sectionTotals.has(cat)) sectionTotals.set(cat, new Map())
      const secMap = sectionTotals.get(cat)
      secMap.set(section, (secMap.get(section) || 0) + count)
    }
    if (kw) {
      const kwKey = normKey(kw)
      // 자기 이름 제외는 '정확히 같은 문자열'일 때만 (참고 디자인과 동일 기준) — normKey로 비교하면
      // "어드민나이트" 카테고리가 "어드민 나이트"(공백만 다른 키워드)까지 자기 이름으로 오인해 지워버림
      const isSelfName = String(kw).trim() === String(cat).trim()
      let isPersonMatch = false
      personNorm.forEach((p) => {
        if (kwKey.includes(p.key)) {
          isPersonMatch = true
          personCounts.set(p.name, personCounts.get(p.name) + count)
        }
      })

      // 버블 자기 이름("타불라" 카테고리에 키워드 "타불라")과 인물/솔루션 워치리스트에 걸리는
      // 키워드는 태그 목록에서 뺀다 — 전자는 원 중앙 이름과 중복이고, 후자는 이미 별도의
      // "솔루션·인물" 태그로 표시되므로 두 번 나오면 안 됨 (총 횟수/섹션 비중 집계에는 그대로 포함)
      if (!isSelfName && !isPersonMatch) {
        if (!keywordTotals.has(cat)) keywordTotals.set(cat, new Map())
        addKeywordOccurrence(keywordTotals.get(cat), kw, count, section)
      }
    }
  }

  const mixFor = (cat) => {
    const secMap = sectionTotals.get(cat)
    if (!secMap) return []
    const sum = [...secMap.values()].reduce((a, b) => a + b, 0)
    if (sum === 0) return []
    return [...secMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([section, count]) => ({ section, pct: +((count / sum) * 100).toFixed(1) }))
  }

  // 언급 많은 순으로 정렬하되(동점이면 짧은 문구 우선), mixSections(그 카테고리에 실제로 섞여
  // 있는 섹션들, 비중 큰 순)가 2개 이상이면 각 섹션에서 최소 1개씩부터 채우고 나머지를 채운다 —
  // 그래야 파이에 색이 있는 섹션인데 태그는 한쪽 섹션에서만 나오는 일이 없다
  const topKeywords = (cat, max, mixSections) => {
    const map = keywordTotals.get(cat)
    if (!map) return []
    const all = [...map.values()]
      .map(finalizeKeywordEntry)
      .sort((a, b) => b.count - a.count || a.name.length - b.name.length)

    const selected = []
    const used = new Set()
    if (mixSections && mixSections.length > 1) {
      for (const sec of mixSections) {
        if (selected.length >= max) break
        const cand = all.find((e) => e.section === sec && !used.has(e.name))
        if (cand) {
          selected.push(cand)
          used.add(cand.name)
        }
      }
    }
    for (const e of all) {
      if (selected.length >= max) break
      if (used.has(e.name)) continue
      selected.push(e)
      used.add(e.name)
    }
    return selected
  }

  const allCategories = [...totals.entries()]
    .map(([name, total]) => {
      const mix = mixFor(name)
      const mixSections = mix.map((m) => m.section)
      return {
        name,
        total,
        section: mix.length > 0 ? mix[0].section : null,
        mix,
        // 언급이 적은(<=15회) 카테고리는 태그도 3개 정도만 — 원이 작은데 태그가 5개나 붙으면
        // 서로 겹치기 쉽다
        keywords: topKeywords(name, total <= 15 ? 3 : 5, mixSections),
      }
    })
    .sort((a, b) => b.total - a.total)

  // TOP5: 동점은 같은 순위로 취급하고 그다음 순위까지 연쇄적으로 포함한다 (dense rank).
  // 예: 18회×3 · 15회×3 · 14회×2 처럼 동점이 이어지면 top5보다 카테고리 수가 늘어날 수 있다.
  const distinctTotals = [...new Set(allCategories.map((c) => c.total))].sort((a, b) => b - a)
  const rankOf = (total) => distinctTotals.indexOf(total) + 1
  const categories = allCategories.filter((c) => rankOf(c.total) <= 5)

  const people = PERSON_WATCHLIST.map((name) => ({ name, count: personCounts.get(name) })).filter(
    (p) => p.count > 0
  )

  const misc = [...miscKeywords.values()]
    .map(finalizeKeywordEntry)
    .sort((a, b) => b.count - a.count || a.name.length - b.name.length)
    .slice(0, 5)
    .map((e) => e.name)

  return { categories, people, misc }
}

const SECTION_ORDER = ['About', 'Data', 'Media', 'People', 'Trend']

function formatDuration(str) {
  // "4m 46s" -> 초 단위 숫자
  if (typeof str !== 'string') return null
  const m = str.match(/(\d+)\s*m/)
  const s = str.match(/(\d+)\s*s/)
  const minutes = m ? parseInt(m[1], 10) : 0
  const seconds = s ? parseInt(s[1], 10) : 0
  return minutes * 60 + seconds
}

function secondsToDuration(sec) {
  if (sec == null || Number.isNaN(sec)) return null
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}m ${s}s`
}

function formatDurationDelta(deltaSeconds) {
  const sign = deltaSeconds > 0 ? '+' : deltaSeconds < 0 ? '-' : ''
  const abs = Math.abs(deltaSeconds)
  if (abs < 60) return `${sign}${abs}초`
  const m = Math.floor(abs / 60)
  const s = abs % 60
  return `${sign}${m}분 ${s}초`
}

function kpiField(curr, prev, { isPercent = false, isDuration = false } = {}) {
  if (curr == null) return { value: null, delta: null, dir: null, hasPrev: false }
  let value = curr
  let formattedValue = value
  if (isDuration) formattedValue = value // already display string e.g. "4m 46s"

  if (prev == null) {
    return { raw: curr, value: formattedValue, delta: null, dir: null, hasPrev: false }
  }

  let delta
  let dir
  if (isDuration) {
    const currSec = formatDuration(curr)
    const prevSec = formatDuration(prev)
    const diff = currSec - prevSec
    delta = formatDurationDelta(diff)
    dir = diff > 0 ? 'up' : diff < 0 ? 'down' : null
  } else if (isPercent) {
    const diff = curr - prev
    delta = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%p`
    dir = diff > 0 ? 'up' : diff < 0 ? 'down' : null
  } else {
    const diff = ((curr - prev) / prev) * 100
    delta = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`
    dir = diff > 0 ? 'up' : diff < 0 ? 'down' : null
  }
  return { raw: curr, value: formattedValue, delta, dir, hasPrev: true }
}

/** 여러 달을 하나로 합친 "홈(통합 인덱스)" 요약. months[]는 이미 parseWorkbook이 만든 최종
 *  값이라 여기서 시트를 다시 읽지 않는다 — 엑셀에 월이 늘어나면(7월, 8월 …) 이 함수는 코드
 *  수정 없이 그 달들도 자동으로 합산 대상에 포함한다. */
function computeOverview(months) {
  if (!months || months.length === 0) return null

  const sumBy = (fn) => months.reduce((s, m) => s + (fn(m) || 0), 0)
  const totalViews = sumBy((m) => m.kpi.views.value)
  const totalVisitors = sumBy((m) => m.kpi.visitors.value)
  const totalVisits = sumBy((m) => m.kpi.visits.value)

  // 재방문율(%)·평균사용시간(초)은 달마다 단순 합산이 의미가 없는 "비율/평균" 지표라, 그 달의
  // 방문횟수를 가중치로 삼아 가중평균한다 — 방문횟수가 많았던 달의 값이 더 크게 반영된다.
  const weightSum = sumBy((m) => m.kpi.visits.value) || 1
  const avgRevisit = sumBy((m) => (m.kpi.revisit.value ?? 0) * (m.kpi.visits.value || 0)) / weightSum
  const avgAvgtimeSec =
    sumBy((m) => (formatDuration(m.kpi.avgtime.value) ?? 0) * (m.kpi.visits.value || 0)) / weightSum

  // "가장 크게 성장한 지표": 조회수·순방문자수·방문횟수는 전부 "%" 단위 증감이라 서로 비교할 수
  // 있지만, 재방문율(%p)과 평균사용시간(초)은 단위 자체가 달라 같은 비교에 넣지 않는다.
  // 비교 기준은 가장 최근 달의 전월 대비 값.
  const latest = months[months.length - 1]
  const growthCandidates = [
    { label: '조회수', field: latest.kpi.views },
    { label: '순방문자수', field: latest.kpi.visitors },
    { label: '방문횟수', field: latest.kpi.visits },
  ].filter((c) => c.field.hasPrev && c.field.dir === 'up')
  const bestGrowth = growthCandidates.length
    ? growthCandidates.reduce((best, c) => (parseFloat(c.field.delta) > parseFloat(best.field.delta) ? c : best))
    : null

  const topVisitorMonth = months.reduce((best, m) => (m.kpi.visitors.value > (best?.kpi.visitors.value ?? -1) ? m : best), null)
  const topViewsMonth = months.reduce((best, m) => (m.kpi.views.value > (best?.kpi.views.value ?? -1) ? m : best), null)

  // 전체 기간 통틀어 조회수가 가장 많았던 게시물 top3 (각 달의 인기게시물 Top10을 다시 합쳐서 비교)
  const allPosts = months.flatMap((m) => (m.posts || []).map((p) => ({ ...p, monthKey: m.key, monthLabel: m.label })))
  const topPosts = [...allPosts]
    .filter((p) => p.views != null)
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)

  // 유입경로/유입검색어 통합 1위: 이름이 같으면 달을 넘나들며 합치고, 각 달의 비중(%)을 그 달의
  // 방문횟수로 가중평균해서 1위를 뽑는다. 원본이 달마다 top5까지만 주기 때문에, top5 밖으로
  // 밀린 달의 기여분은 반영되지 못하는 한계가 있다.
  function weightedTopName(field) {
    const weightedSum = new Map()
    const weightTotal = new Map()
    months.forEach((m) => {
      const w = m.kpi.visits.value || 0
      ;(m[field] || []).forEach((item) => {
        weightedSum.set(item.name, (weightedSum.get(item.name) || 0) + item.pct * w)
        weightTotal.set(item.name, (weightTotal.get(item.name) || 0) + w)
      })
    })
    let best = null
    for (const [name, sum] of weightedSum) {
      const avgPct = sum / (weightTotal.get(name) || 1)
      if (!best || avgPct > best.avgPct) best = { name, avgPct: +avgPct.toFixed(2) }
    }
    return best
  }

  return {
    monthCount: months.length,
    totalViews,
    totalVisitors,
    totalVisits,
    avgRevisit: +avgRevisit.toFixed(2),
    avgAvgtime: secondsToDuration(avgAvgtimeSec),
    bestGrowth: bestGrowth ? { label: bestGrowth.label, delta: bestGrowth.field.delta, monthKey: latest.key, monthLabel: latest.label } : null,
    topVisitorMonth: topVisitorMonth && { key: topVisitorMonth.key, label: topVisitorMonth.label, value: topVisitorMonth.kpi.visitors.value },
    topViewsMonth: topViewsMonth && { key: topViewsMonth.key, label: topViewsMonth.label, value: topViewsMonth.kpi.views.value },
    topPosts,
    topReferrer: weightedTopName('referrers'),
    topKeyword: weightedTopName('keywords'),
    // label은 "2026.06" 형식 — TrendChart가 그 형식을 기대하고 축 눈금에서 뒤 2글자(월)만 잘라 쓴다
    trend: months.map((m) => ({
      key: m.key,
      label: `${m.year}.${String(m.monthNumber).padStart(2, '0')}`,
      monthLabel: m.label,
      views: m.kpi.views.value,
      visitors: m.kpi.visitors.value,
    })),
    latestKey: latest.key,
  }
}

/** 워크북 전체를 파싱해 대시보드가 바로 쓸 수 있는 구조로 변환 */
export function parseWorkbook(workbook) {
  const keywordSheets = workbook.SheetNames.filter((n) => KEYWORD_SHEET_RE.test(noSpace(n)))
  const categorySheets = workbook.SheetNames.filter((n) => CATEGORY_SHEET_RE.test(noSpace(n)))

  const parsedKeyword = keywordSheets
    .map((name) => parseKeywordSheet(workbook, name))
    .filter((m) => m.monthNumber != null && m.stats.views != null) // 아직 비어있는 월(템플릿) 제외

  const categoryByMonth = new Map()
  for (const name of categorySheets) {
    const monthNumber = extractMonthNumber(name, CATEGORY_SHEET_RE)
    if (monthNumber == null) continue
    categoryByMonth.set(monthNumber, parseCategorySheet(workbook, name))
  }

  // 연-월 기준으로 정렬 (같은 달이라도 연도가 다를 수 있음)
  parsedKeyword.sort((a, b) => (a.year - b.year) || (a.monthNumber - b.monthNumber))

  // 월간 조회수/순방문자 추이: 모든 시트의 표를 합쳐 하나의 연속 시계열로
  const trendMap = new Map()
  for (const m of parsedKeyword) {
    for (const t of m.viewsTrend) {
      const key = `${t.year}.${String(t.month).padStart(2, '0')}`
      const entry = trendMap.get(key) || { year: t.year, month: t.month, label: key }
      entry.views = t.value
      trendMap.set(key, entry)
    }
    for (const t of m.visitorsTrend) {
      const key = `${t.year}.${String(t.month).padStart(2, '0')}`
      const entry = trendMap.get(key) || { year: t.year, month: t.month, label: key }
      entry.visitors = t.value
      trendMap.set(key, entry)
    }
  }
  const trend = [...trendMap.values()].sort((a, b) => (a.year - b.year) || (a.month - b.month))

  const months = parsedKeyword.map((m, idx) => {
    const prev = idx > 0 ? parsedKeyword[idx - 1] : null
    const { categories = [], people = [], misc = [] } = categoryByMonth.get(m.monthNumber) || {}

    // 전월 조회수/순방문자수는 형제 시트(parsedKeyword[idx-1])가 없어도, 이 시트 자신에 실려 있는
    // "월간조회수추이"/"월간순방문자추이" 표에서 바로 앞 달을 찾아 구한다 — 그래서 지금 엑셀에서
    // 가장 이른 달(4월)이라도 그 표에 3월이 있으면 전월대비를 보여줄 수 있다.
    const prevYear = m.monthNumber === 1 ? m.year - 1 : m.year
    const prevMonthNumber = m.monthNumber === 1 ? 12 : m.monthNumber - 1
    const findTrend = (arr) => arr.find((t) => t.year === prevYear && t.month === prevMonthNumber)?.value ?? null
    const prevViews = prev?.stats.views ?? findTrend(m.viewsTrend)
    const prevVisitors = prev?.stats.visitors ?? findTrend(m.visitorsTrend)

    // 방문횟수/재방문율/평균사용시간은 추이표가 없어 시트만으로는 전월값을 구할 수 없다. 지금
    // 엑셀에 없는 2026-03(3월) 시트만 예외로 문서화해 둔다 — 원본 슬라이드(월간_블로그_통계_통합__0713.pptx,
    // 4월 슬라이드)에 이미 계산되어 있던 전월대비(-21.2%/+2.0%p/-17초)를 역산한 값. 재방문율·평균사용시간은
    // 그 슬라이드가 %p/초 단위 "차이"를 그대로 보여주므로 역산이 정확하고, 방문횟수는 비율(%) delta라
    // 반올림된 표시값에서 되돌린 근사값이다(1581±1이어도 "-21.2%"로 동일하게 표시됨). 실제 3월 시트가
    // 추가되면 prev가 채워지므로 이 예외는 자동으로 쓰이지 않게 된다.
    const PRIOR_MONTH_FALLBACK = { '2026-3': { visits: 1581, revisit: 3.9, avgtime: '4m 37s' } }
    const fallback = PRIOR_MONTH_FALLBACK[`${prevYear}-${prevMonthNumber}`]
    const prevVisits = prev?.stats.visits ?? fallback?.visits ?? null
    const prevRevisit = prev?.stats.revisit ?? fallback?.revisit ?? null
    const prevAvgtime = prev?.stats.avgtime ?? fallback?.avgtime ?? null

    return {
      key: `${m.year}-${String(m.monthNumber).padStart(2, '0')}`,
      monthNumber: m.monthNumber,
      year: m.year,
      label: `${m.monthNumber}월`,
      period: `${m.year}.${String(m.monthNumber).padStart(2, '0')}.01 ~ ${String(m.monthNumber).padStart(2, '0')}.${new Date(m.year, m.monthNumber, 0).getDate()}`,
      kpi: {
        views: kpiField(m.stats.views, prevViews),
        visitors: kpiField(m.stats.visitors, prevVisitors),
        visits: kpiField(m.stats.visits, prevVisits),
        revisit: kpiField(m.stats.revisit, prevRevisit, { isPercent: true }),
        avgtime: kpiField(m.stats.avgtime, prevAvgtime, { isDuration: true }),
        ai: m.ai || { value: null, cumulative: null },
      },
      referrers: m.referrers,
      keywords: m.keywords,
      device: m.device,
      posts: m.posts,
      categories,
      people,
      misc,
    }
  })

  return {
    months,
    trend,
    sectionOrder: SECTION_ORDER,
    overview: computeOverview(months),
  }
}

/** File/Buffer 어느 쪽이든 받아서 파싱 (브라우저 File 객체 or Node Buffer) */
export async function parseExcelInput(input) {
  let workbook
  if (typeof Buffer !== 'undefined' && input instanceof Buffer) {
    workbook = XLSX.read(input, { type: 'buffer', cellHTML: false })
  } else {
    const buffer = await input.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array', cellHTML: false })
  }
  return parseWorkbook(workbook)
}
