import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface RiskBadgeProps {
  level: 'none' | 'low' | 'medium' | 'high'
}

export function RiskBadge({ level }: RiskBadgeProps) {
  if (level === 'none') {
    return null
  }

  const config = {
    low: {
      variant: 'secondary' as const,
      className: 'text-yellow-600',
      label: 'Low Risk',
    },
    medium: {
      variant: 'outline' as const,
      className: 'text-orange-600 border-orange-300',
      label: 'At Risk',
    },
    high: {
      variant: 'destructive' as const,
      className: '',
      label: 'High Risk',
    },
  }

  const { variant, className, label } = config[level]

  return (
    <Badge variant={variant} className={className}>
      <AlertTriangle className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  )
}
