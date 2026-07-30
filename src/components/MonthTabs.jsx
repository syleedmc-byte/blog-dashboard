export default function MonthTabs({ months, active, onSelect }) {
  return (
    <div className="month-tabs">
      {months.map((m) => (
        <button
          key={m.key}
          type="button"
          className={`month-tab ${m.key === active ? 'active' : ''}`}
          onClick={() => onSelect(m.key)}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
