import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { DEVICE_PC, DEVICE_MOBILE } from '../theme.js'

export default function DeviceDonut({ device }) {
  const data = [
    { key: 'pc', name: 'PC', value: device.pc ?? 0, color: DEVICE_PC },
    { key: 'mobile', name: '모바일', value: device.mobile ?? 0, color: DEVICE_MOBILE },
  ]
  return (
    <div className="device-row">
      <PieChart width={86} height={86}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={28}
          outerRadius={40}
          startAngle={90}
          endAngle={-270}
          stroke="var(--card)"
          strokeWidth={2}
        >
          {data.map((d) => (
            <Cell key={d.key} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${Number(value).toFixed(2)}%`, name]}
          contentStyle={{
            background: 'var(--card)',
            border: '1px solid var(--card-border)',
            borderRadius: 10,
            fontSize: 12,
          }}
        />
      </PieChart>
      <div className="device-legend">
        <div className="item">
          <span className="swatch" style={{ background: DEVICE_PC }} />
          PC <span className="pct">{device.pc != null ? `${device.pc.toFixed(2)}%` : '-'}</span>
        </div>
        <div className="item">
          <span className="swatch" style={{ background: DEVICE_MOBILE }} />
          모바일 <span className="pct">{device.mobile != null ? `${device.mobile.toFixed(2)}%` : '-'}</span>
        </div>
      </div>
    </div>
  )
}
