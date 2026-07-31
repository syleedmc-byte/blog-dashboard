#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import { parseWorkbook } from '../src/lib/parseExcel.js'

// 이 스크립트가 하는 일:
//   1. data/ 폴더(또는 명령줄로 넘긴 경로)에서 엑셀 파일을 찾는다
//   2. src/lib/parseExcel.js 로 모든 월 시트를 파싱한다
//   3. 결과를 src/data/dashboard-data.json 으로 저장한다 (대시보드가 그대로 읽어 그림)
//
// 사용법:
//   node scripts/update.js                → data/ 폴더에서 가장 최근에 수정된 .xlsx 자동 선택
//   node scripts/update.js "경로/파일.xlsx" → 특정 엑셀 파일을 지정해서 반영

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'data')
const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'dashboard-data.json')

function findLatestExcel() {
  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`데이터 폴더가 없습니다: ${DATA_DIR}`)
  }
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~$'))
  if (files.length === 0) {
    throw new Error(`data/ 폴더에 엑셀 파일(.xlsx)이 없습니다. 새 엑셀 파일을 data/ 폴더에 넣고 다시 실행해 주세요.`)
  }
  files.sort((a, b) => fs.statSync(path.join(DATA_DIR, b)).mtimeMs - fs.statSync(path.join(DATA_DIR, a)).mtimeMs)
  return path.join(DATA_DIR, files[0])
}

function formatNumber(n) {
  return typeof n === 'number' ? n.toLocaleString('ko-KR') : n
}

function main() {
  const argPath = process.argv[2]
  const excelPath = argPath ? path.resolve(process.cwd(), argPath) : findLatestExcel()

  if (!fs.existsSync(excelPath)) {
    throw new Error(`엑셀 파일을 찾을 수 없습니다: ${excelPath}`)
  }

  console.log(`엑셀 파일을 읽는 중: ${excelPath}`)
  const buf = fs.readFileSync(excelPath)
  const workbook = XLSX.read(buf, { type: 'buffer' })
  const data = parseWorkbook(workbook)

  if (data.months.length === 0) {
    throw new Error(
      '파싱된 월 데이터가 없습니다. 시트 이름이 "키워드 분석(N월)" / "카테고리 분류(N월)" 형식인지 확인해 주세요.'
    )
  }

  const output = {
    ...data,
    sourceFile: path.basename(excelPath),
    updatedAt: new Date().toISOString(),
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8')

  console.log(`\n완료: ${path.relative(ROOT, OUTPUT_PATH)} 생성됨`)
  console.log(`반영된 월: ${data.months.map((m) => m.key).join(', ')}\n`)

  const latest = data.months[data.months.length - 1]
  console.log(`[검증용] 최신 월(${latest.label}) 핵심 수치 — 엑셀 원본과 대조해 보세요:`)
  console.log(`  조회수: ${formatNumber(latest.kpi.views.raw)}`)
  console.log(`  순방문자수: ${formatNumber(latest.kpi.visitors.raw)}`)
  console.log(`  방문횟수: ${formatNumber(latest.kpi.visits.raw)}`)
  console.log(`  재방문율: ${latest.kpi.revisit.raw}%`)
  console.log(`  유입경로 1위: ${latest.referrers[0]?.name} (${latest.referrers[0]?.pct}%)`)
  console.log(`  유입검색어 1위: ${latest.keywords[0]?.name} (${latest.keywords[0]?.pct}%)`)
  console.log(`  인기게시글 1위: ${latest.posts[0]?.title}`)

  // [검증용] 홈 페이지의 "역대 인기 게시물" — 각 달 TOP10 중 실제 최댓값과 같은지 대조해 보세요.
  const ov = data.overview
  if (ov) {
    const manualMax = Math.max(...data.months.flatMap((m) => (m.posts || []).map((p) => p.views || 0)))
    console.log(`\n[검증용] 홈 페이지 역대 인기게시물 1위: ${ov.topPosts[0]?.title} (${ov.topPosts[0]?.monthLabel}, ${formatNumber(ov.topPosts[0]?.views)}회, 각 달 TOP10 전체 중 최댓값과 일치=${ov.topPosts[0]?.views === manualMax})`)
    console.log(`  전체 추이 그래프 대상 달: ${data.trend.map((t) => t.label).join(', ')} (${data.trend.length}개월)`)
    console.log(`\n[검증용] 홈 페이지 헤드라인 인사이트 — 엑셀 원본 수치와 대조해 보세요:`)
    console.log(`  "${ov.headline.sentence}"`)
    console.log(`  지표: ${ov.headline.metricLabel} ${ov.headline.value} (${ov.headline.trendText ?? '전월 비교 없음'})`)
    if (ov.secondaryInsights.length > 0) {
      console.log(`  보조 인사이트 ${ov.secondaryInsights.length}개:`)
      ov.secondaryInsights.forEach((s) => console.log(`    - ${s.title}: ${s.detail} (${s.note})`))
    } else {
      console.log(`  보조 인사이트: 없음 (비교할 전월 데이터 없음)`)
    }

    if (ov.topMover) {
      console.log(`\n[검증용] 이번 달 급성장 게시물: "${ov.topMover.title}" ${ov.topMover.prevLabel} ${formatNumber(ov.topMover.prevViews)}회 → ${ov.topMover.curLabel} ${formatNumber(ov.topMover.curViews)}회 (+${ov.topMover.growthPct}%)`)
    } else {
      console.log(`\n[검증용] 이번 달 급성장 게시물: 없음 (전월과 겹치면서 조회수가 늘어난 글 없음)`)
    }

    if (ov.categoryMix.length > 0) {
      console.log(`[검증용] 이번 달 인기글 주제 비중(카테고리 분류 데이터 기준 상위 5개, 합계 100%여야 함): ${ov.categoryMix.map((m) => `${m.name} ${m.pct}%`).join(', ')} (개수=${ov.categoryMix.length})`)
    } else {
      console.log(`[검증용] 이번 달 인기글 주제 비중: 계산 불가 (카테고리 데이터 없음)`)
    }

    const yearMonths = data.months.filter((m) => m.year === ov.cumulative.year)
    const manualTotalViews = yearMonths.reduce((s, m) => s + (m.kpi.views.raw || 0), 0)
    const manualTotalVisitors = yearMonths.reduce((s, m) => s + (m.kpi.visitors.raw || 0), 0)
    console.log(`[검증용] ${ov.cumulative.year}년 누적 조회수: ${formatNumber(ov.cumulative.totalViews)} (직접 합산과 일치=${ov.cumulative.totalViews === manualTotalViews})`)
    console.log(`[검증용] ${ov.cumulative.year}년 누적 순방문자수: ${formatNumber(ov.cumulative.totalVisitors)} (직접 합산과 일치=${ov.cumulative.totalVisitors === manualTotalVisitors})`)
    console.log(`[검증용] 급성장 게시물 링크: ${ov.topMover?.url ?? '(링크 없음)'}`)
    console.log(`[검증용] AI 브리핑 인용수 누적: ${formatNumber(ov.cumulative.aiCumulative)} (엑셀에 실제 값 없으면 폴백 36,000이 표시되어야 함)`)
    console.log(`[검증용] 역대 인기게시물 개수: ${ov.topPosts.length}개 (top10 기준)`)
  }

  console.log(`\n이제 "npm run dev"로 화면을 확인하거나, git commit + push로 배포하세요.`)
}

main()
