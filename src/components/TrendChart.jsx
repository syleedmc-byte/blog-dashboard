import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { SERIES_VIEWS, SERIES_VISITORS } from '../theme.js'

function TooltipContent({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-border)',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,.12)',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--sub)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span>{p.name}</span>
          <b style={{ color: 'var(--ink)', marginLeft: 'auto' }}>{p.value?.toLocaleString('ko-KR')}</b>
        </div>
      ))}
    </div>
  )
}

export default function TrendChart({ trend, activeLabel }) {
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 240 }}>
        <LineChart data={trend} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--sub)' }}
            axisLine={{ stroke: 'var(--line)' }}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: 'var(--sub)' }} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<TooltipContent />} />
          <Legend
            verticalAlign="top"
            align="left"
            height={28}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: 'var(--sub)' }}
          />
          <Line
            type="monotone"
            dataKey="views"
            name="조회수"
            stroke={SERIES_VIEWS}
            strokeWidth={2}
            dot={(props) => (
              <circle
                key={props.payload.label}
                cx={props.cx}
                cy={props.cy}
                r={props.payload.label === activeLabel ? 5 : 3}
                fill={SERIES_VIEWS}
              />
            )}
          />
          <Line
            type="monotone"
            dataKey="visitors"
            name="순방문자수"
            stroke={SERIES_VISITORS}
            strokeWidth={2}
            dot={(props) => (
              <circle
                key={props.payload.label}
                cx={props.cx}
                cy={props.cy}
                r={props.payload.label === activeLabel ? 5 : 3}
                fill={SERIES_VISITORS}
              />
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
