/** 카드 안에 작게 들어가는 최근 추이 미니 그래프. 실제 추이 데이터(조회수·순방문자수)가 있는
 *  지표에만 쓴다 — 방문횟수·재방문율·평균사용시간은 엑셀 어디에도 과거 추이가 없어서 만들지 않음. */
export default function Sparkline({ values, color, width = 68, height = 26 }) {
  if (!values || values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="sparkline">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
