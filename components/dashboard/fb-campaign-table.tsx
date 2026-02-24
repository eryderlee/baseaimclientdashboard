'use client'

import { getActionValue } from '@/lib/facebook-ads'
import type { FbCampaignInsight } from '@/lib/facebook-ads'

interface FbCampaignTableProps {
  campaigns: FbCampaignInsight[]
}

export function FbCampaignTable({ campaigns }: FbCampaignTableProps) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center">
        <p className="text-sm text-slate-500">No campaign data available for this period.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Campaign
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
              Spend
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
              Impressions
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
              Clicks
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
              Leads
            </th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const leads =
              getActionValue(campaign.actions, 'lead') +
              getActionValue(campaign.actions, 'offsite_conversion.fb_pixel_lead')

            return (
              <tr
                key={campaign.campaign_id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">
                  {campaign.campaign_name}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  ${parseFloat(campaign.spend).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {parseInt(campaign.impressions).toLocaleString('en-US')}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {parseInt(campaign.clicks).toLocaleString('en-US')}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {leads}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
