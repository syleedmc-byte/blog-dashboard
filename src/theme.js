// dataviz 스킬 검증 팔레트 — validate_palette.js 로 light/dark 모두 통과 확인됨.
// 실제 hex 값은 index.css 에 CSS 변수로 선언되어 있고(다크모드 자동 대응),
// 차트 컴포넌트는 여기서 그 변수 이름만 참조한다.

// 카테고리 색상은 고정 순서로만 매핑한다(데이터에 따라 절대 순환하지 않음)
export const SECTION_ORDER = ['About', 'Data', 'Media', 'People', 'Trend']

export function sectionColorVar(section) {
  const key = SECTION_ORDER.includes(section) ? section : 'About'
  return `var(--sec-${key.toLowerCase()})`
}

export const SERIES_VIEWS = 'var(--series-views)'
export const SERIES_VISITORS = 'var(--series-visitors)'
export const DEVICE_PC = 'var(--device-pc)'
export const DEVICE_MOBILE = 'var(--device-mobile)'
