'use client'

import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'
import type { FbInsights, FbCampaignInsight, FbPlatformRow, FbAction } from '@/lib/facebook-ads'
import { getActionValue } from '@/lib/facebook-ads'

interface ExportButtonsProps {
  insights: FbInsights
  dateRange: string
  campaigns?: FbCampaignInsight[]
  platforms?: FbPlatformRow[]
}

// Helper: sum lead-related action types from the actions array
function getLeads(actions?: FbAction[]): number {
  return (
    getActionValue(actions, 'lead') +
    getActionValue(actions, 'offsite_conversion.fb_pixel_lead')
  )
}

// Helper: sum outbound clicks from the outbound_clicks FbAction[] array
function getOutboundClicks(outbound_clicks?: FbAction[]): number {
  if (!outbound_clicks) return 0
  return outbound_clicks.reduce((sum, a) => sum + parseFloat(a.value), 0)
}

// Helper: calculate cost per lead; returns null when leads === 0
function getCplValue(spend: string, actions?: FbAction[]): number | null {
  const leads = getLeads(actions)
  if (leads === 0) return null
  return parseFloat(spend) / leads
}

function exportCsv(insights: FbInsights, dateRange: string) {
  const leads = getLeads(insights.actions)
  const cplValue = getCplValue(insights.spend, insights.actions)
  const rows = [
    ['Metric', 'Value'],
    ['Ad Spend', `$${parseFloat(insights.spend).toFixed(2)}`],
    ['Impressions', parseInt(insights.impressions).toString()],
    ['Clicks', parseInt(insights.clicks).toString()],
    ['CTR', `${parseFloat(insights.ctr).toFixed(2)}%`],
    ['CPC', `$${parseFloat(insights.cpc).toFixed(2)}`],
    ['CPM', `$${parseFloat(insights.cpm).toFixed(2)}`],
    ['Reach', parseInt(insights.reach ?? '0').toString()],
    ['Frequency', parseFloat(insights.frequency ?? '0').toFixed(2)],
    ['Leads', String(leads)],
    ['Cost Per Lead', cplValue !== null ? `$${cplValue.toFixed(2)}` : 'N/A'],
    ['Outbound Clicks', String(getOutboundClicks(insights.outbound_clicks))],
    ['Landing Page Views', String(getActionValue(insights.actions, 'landing_page_view'))],
    ['Quality Ranking', insights.quality_ranking ?? 'N/A'],
    ['Engagement Rate Ranking', insights.engagement_rate_ranking ?? 'N/A'],
    ['Conversion Rate Ranking', insights.conversion_rate_ranking ?? 'N/A'],
    ['Date Start', insights.date_start],
    ['Date Stop', insights.date_stop],
  ]

  const date = new Date().toISOString().slice(0, 10)
  const csv = rows.map((row) => row.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `baseaim-fb-report-${dateRange}-${date}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

async function exportPdf(
  insights: FbInsights,
  dateRange: string,
  campaigns?: FbCampaignInsight[],
  platforms?: FbPlatformRow[]
) {
  // Dynamic import — jspdf and jspdf-autotable are browser-only, avoid SSR bundle
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')

  const date = new Date().toISOString().slice(0, 10)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // --- Branded header bar ---
  doc.setFillColor(37, 99, 235) // #2563eb
  doc.rect(0, 0, 210, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('BASEAIM', 10, 15)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Facebook Ads Performance Report', 55, 15)

  // --- Date range subtitle ---
  doc.setTextColor(102, 102, 102)
  doc.setFontSize(10)
  doc.text(`${insights.date_start} to ${insights.date_stop}`, 10, 30)

  // --- Metrics section (12 metrics in two columns) ---
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(10)

  const leftMetrics: [string, string][] = [
    ['Ad Spend', `$${parseFloat(insights.spend).toFixed(2)}`],
    ['Impressions', parseInt(insights.impressions).toLocaleString('en-US')],
    ['Clicks', parseInt(insights.clicks).toLocaleString('en-US')],
    ['CTR', `${parseFloat(insights.ctr).toFixed(2)}%`],
    ['CPC', `$${parseFloat(insights.cpc).toFixed(2)}`],
    ['CPM', `$${parseFloat(insights.cpm).toFixed(2)}`],
  ]

  const cplVal = getCplValue(insights.spend, insights.actions)
  const rightMetrics: [string, string][] = [
    ['Reach', parseInt(insights.reach ?? '0').toLocaleString('en-US')],
    ['Frequency', parseFloat(insights.frequency ?? '0').toFixed(2)],
    ['Leads', String(getLeads(insights.actions))],
    ['Cost Per Lead', cplVal !== null ? `$${cplVal.toFixed(2)}` : 'N/A'],
    ['Outbound Clicks', String(getOutboundClicks(insights.outbound_clicks))],
    ['LPV', String(getActionValue(insights.actions, 'landing_page_view'))],
  ]

  const y = 38
  leftMetrics.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label + ':', 10, y + i * 8)
    doc.setFont('helvetica', 'normal')
    doc.text(value, 50, y + i * 8)
  })
  rightMetrics.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label + ':', 110, y + i * 8)
    doc.setFont('helvetica', 'normal')
    doc.text(value, 155, y + i * 8)
  })

  // --- Quality rankings (below metrics) ---
  const rankings = [
    insights.quality_ranking,
    insights.engagement_rate_ranking,
    insights.conversion_rate_ranking,
  ].filter((r) => r && r !== 'UNKNOWN')

  if (rankings.length > 0) {
    const rankingY = 38 + 6 * 8 + 6
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text(
      `Rankings — Quality: ${insights.quality_ranking ?? 'N/A'} | Engagement: ${insights.engagement_rate_ranking ?? 'N/A'} | Conversion: ${insights.conversion_rate_ranking ?? 'N/A'}`,
      10,
      rankingY
    )
  }

  // --- Campaign table (via jspdf-autotable) ---
  if (campaigns && campaigns.length > 0) {
    const campaignStartY = 38 + 6 * 8 + 14
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    doc.text('Top Campaigns', 10, campaignStartY)

    autoTable(doc, {
      startY: campaignStartY + 4,
      head: [['Campaign', 'Spend', 'Impressions', 'Clicks', 'Leads']],
      body: campaigns.map((c) => [
        c.campaign_name,
        `$${parseFloat(c.spend).toFixed(2)}`,
        parseInt(c.impressions).toLocaleString('en-US'),
        parseInt(c.clicks).toLocaleString('en-US'),
        String(
          getActionValue(c.actions, 'lead') +
            getActionValue(c.actions, 'offsite_conversion.fb_pixel_lead')
        ),
      ]),
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10 },
    })
  }

  // --- Platform split table (via jspdf-autotable) ---
  if (platforms && platforms.length > 0) {
    const afterCampaigns =
      campaigns && campaigns.length > 0
        ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
        : 38 + 6 * 8 + 14

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    doc.text('Platform Breakdown', 10, afterCampaigns)

    autoTable(doc, {
      startY: afterCampaigns + 4,
      head: [['Platform', 'Spend', 'Impressions', 'Clicks']],
      body: platforms.map((p) => [
        p.publisher_platform.charAt(0).toUpperCase() + p.publisher_platform.slice(1),
        `$${parseFloat(p.spend).toFixed(2)}`,
        parseInt(p.impressions).toLocaleString('en-US'),
        parseInt(p.clicks).toLocaleString('en-US'),
      ]),
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10 },
    })
  }

  // --- Footer ---
  doc.setFontSize(8)
  doc.setTextColor(153, 153, 153)
  doc.text('Generated by BaseAim | ' + new Date().toLocaleDateString('en-US'), 10, 285)

  doc.save(`baseaim-fb-report-${dateRange}-${date}.pdf`)
}

export function ExportButtons({ insights, dateRange, campaigns, platforms }: ExportButtonsProps) {
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
        onClick={() => exportPdf(insights, dateRange, campaigns, platforms)}
      >
        <FileText className="h-4 w-4 mr-2" />
        Export PDF
      </Button>
    </div>
  )
}
