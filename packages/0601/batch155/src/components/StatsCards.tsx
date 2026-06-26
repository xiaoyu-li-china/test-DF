import { Activity, AlertTriangle, PowerOff } from 'lucide-react'

interface StatsCardsProps {
  activeRoutes: number
  delayedRoutes: number
  outOfServiceRoutes: number
}

export default function StatsCards({ activeRoutes, delayedRoutes, outOfServiceRoutes }: StatsCardsProps) {
  const cards = [
    {
      icon: Activity,
      label: '在线线路',
      value: activeRoutes,
      color: '#00e5ff',
      bgColor: 'rgba(0, 229, 255, 0.08)',
      borderColor: 'rgba(0, 229, 255, 0.2)',
    },
    {
      icon: AlertTriangle,
      label: '晚点线路',
      value: delayedRoutes,
      color: '#ff3d71',
      bgColor: 'rgba(255, 61, 113, 0.08)',
      borderColor: 'rgba(255, 61, 113, 0.2)',
    },
    {
      icon: PowerOff,
      label: '停运线路',
      value: outOfServiceRoutes,
      color: '#5a6080',
      bgColor: 'rgba(90, 96, 128, 0.08)',
      borderColor: 'rgba(90, 96, 128, 0.2)',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg p-3 border backdrop-blur-sm"
          style={{
            backgroundColor: card.bgColor,
            borderColor: card.borderColor,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
            <span className="text-[10px] text-[#7b89b8]">{card.label}</span>
          </div>
          <div className="text-2xl font-bold font-display tabular-nums" style={{ color: card.color }}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  )
}
