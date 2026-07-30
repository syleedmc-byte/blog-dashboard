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

/** 카테고리 분류 시트 파싱 (참고 디자인 blog_dashboard_monthly_18.html의 버블차트 로직과 동일):
 *  - "기타"(미분류 묶음)는 버블차트 대상에서 제외
 *  - 섹션은 다수결이 아니라 환산횟수 가중합으로 비중(mix)을 계산해 파이 조각으로 표시
 *  - TOP5, 5위가 동점이면 그 동점 그룹만 통째로 포함 (동점이 top5 경계에 걸릴 때만 확장)
 *  - 카테고리별 키워드는 3~7개
 *  - 인물/솔루션 워치리스트 언급 횟수는 카테고리와 무관하게 시트 전체에서 합산 */
function parseCategorySheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName]
  const grid = sheetToGrid(sheet)
  const header = findHeaderCell(grid, (t) => t === '카테고리', { maxRow: 3 })
  if (!header) return { categories: [], people: [] }

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
  const personNorm = PERSON_WATCHLIST.map((name) => ({ name, key: normKey(name) }))
  const personCounts = new Map(PERSON_WATCHLIST.map((name) => [name, 0]))

  for (let r = header.row + 1; r < grid.length; r++) {
    const cat = cell(grid, r, catCol)
    if (cat == null || cat === '' || String(cat).trim() === '기타') continue
    const count = Number(cell(grid, r, countCol)) || 0
    const section = sectionCol != null ? cell(grid, r, sectionCol) : null
    const kw = kwCol != null ? cell(grid, r, kwCol) : null

    totals.set(cat, (totals.get(cat) || 0) + count)
    if (section) {
      if (!sectionTotals.has(cat)) sectionTotals.set(cat, new Map())
      const secMap = sectionTotals.get(cat)
      secMap.set(section, (secMap.get(section) || 0) + count)
    }
    if (kw) {
      if (!keywordTotals.has(cat)) keywordTotals.set(cat, new Map())
      const kws = keywordTotals.get(cat)
      kws.set(kw, (kws.get(kw) || 0) + count)

      const kwKey = normKey(kw)
      personNorm.forEach((p) => {
        if (kwKey.includes(p.key)) personCounts.set(p.name, personCounts.get(p.name) + count)
      })
    }
  }

  const mixFor = (cat, total) => {
    const secMap = sectionTotals.get(cat)
    if (!secMap || total === 0) return []
    return [...secMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([section, count]) => ({ section, pct: +((count / total) * 100).toFixed(1) }))
  }

  const topKeywords = (cat, max = 7, min = 3) => {
    const kws = keywordTotals.get(cat)
    if (!kws) return []
    const sorted = [...kws.entries()].sort((a, b) => b[1] - a[1])
    return sorted.slice(0, Math.max(min, Math.min(max, sorted.length))).map(([name, count]) => ({ name, count }))
  }

  const allCategories = [...totals.entries()]
    .map(([name, total]) => {
      const mix = mixFor(name, total)
      return {
        name,
        total,
        section: mix.length > 0 ? mix[0].section : null,
        mix,
        keywords: topKeywords(name),
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

  return { categories, people }
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
    const { categories = [], people = [] } = categoryByMonth.get(m.monthNumber) || {}
    return {
      key: `${m.year}-${String(m.monthNumber).padStart(2, '0')}`,
      monthNumber: m.monthNumber,
      year: m.year,
      label: `${m.monthNumber}월`,
      period: `${m.year}.${String(m.monthNumber).padStart(2, '0')}.01 ~ ${String(m.monthNumber).padStart(2, '0')}.${new Date(m.year, m.monthNumber, 0).getDate()}`,
      kpi: {
        views: kpiField(m.stats.views, prev?.stats.views),
        visitors: kpiField(m.stats.visitors, prev?.stats.visitors),
        visits: kpiField(m.stats.visits, prev?.stats.visits),
        revisit: kpiField(m.stats.revisit, prev?.stats.revisit, { isPercent: true }),
        avgtime: kpiField(m.stats.avgtime, prev?.stats.avgtime, { isDuration: true }),
        ai: m.ai || { value: null, cumulative: null },
      },
      referrers: m.referrers,
      keywords: m.keywords,
      device: m.device,
      posts: m.posts,
      categories,
      people,
    }
  })

  return {
    months,
    trend,
    sectionOrder: SECTION_ORDER,
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
