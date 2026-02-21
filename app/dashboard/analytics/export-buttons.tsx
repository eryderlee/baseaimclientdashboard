'use client'

import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'
import type { FbInsights } from '@/lib/facebook-ads'

interface ExportButtonsProps {
  insights: FbInsights
  dateRange: string
}

function exportCsv(insights: FbInsights, dateRange: string) {
  const rows = [
    ['Metric', 'Value'],
    ['Ad Spend', `$${parseFloat(insights.spend).toFixed(2)}`],
    ['Impressions', parseFloat(insights.impressions).toFixed(0)],
    ['Clicks', parseFloat(insights.clicks).toFixed(0)],
    ['CTR', `${parseFloat(insights.ctr).toFixed(2)}%`],
    ['CPC', `$${parseFloat(insights.cpc).toFixed(2)}`],
    ['CPM', `$${parseFloat(insights.cpm).toFixed(2)}`],
    ['Date Start', insights.date_start],
    ['Date Stop', insights.date_stop],
  ]

  const csv = rows.map((row) => row.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `facebook-ads-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

async function exportPdf(insights: FbInsights, dateRange: string) {
  // Dynamic import — jspdf is client-side only, avoid SSR bundle
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  const title = 'Facebook Ads Performance Report'
  const dateLabel = `Date Range: ${insights.date_start} to ${insights.date_stop}`

  doc.setFontSize(18)
  doc.text(title, 20, 20)

  doc.setFontSize(11)
  doc.setTextColor(120, 120, 120)
  doc.text(dateLabel, 20, 30)

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)

  const metrics = [
    ['Ad Spend', `$${parseFloat(insights.spend).toFixed(2)}`],
    ['Impressions', parseFloat(insights.impressions).toLocaleString('en-US')],
    ['Clicks', parseFloat(insights.clicks).toLocaleString('en-US')],
    ['CTR', `${parseFloat(insights.ctr).toFixed(2)}%`],
    ['CPC', `$${parseFloat(insights.cpc).toFixed(2)}`],
    ['CPM', `$${parseFloat(insights.cpm).toFixed(2)}`],
  ]

  let y = 50
  metrics.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, 20, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(value), 80, y)
    y += 12
  })

  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated ${new Date().toLocaleDateString('en-US')}`, 20, y + 10)

  doc.save(`facebook-ads-${dateRange}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function ExportButtons({ insights, dateRange }: ExportButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportCsv(insights, dateRange)}
      >
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportPdf(insights, dateRange)}
      >
        <FileText className="h-4 w-4 mr-2" />
        Export PDF
      </Button>
    </div>
  )
}
