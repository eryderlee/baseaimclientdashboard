'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateOnboardingChecklist } from '@/app/admin/actions'
import { CHECKLIST_SECTIONS } from '@/types/onboarding'
import type { OnboardingChecklist, OnboardingChecklistKey } from '@/types/onboarding'

interface OnboardingChecklistProps {
  clientId: string
  checklist: OnboardingChecklist
}

export function OnboardingChecklistSection({ clientId, checklist: initial }: OnboardingChecklistProps) {
  const [checklist, setChecklist] = useState<OnboardingChecklist>(initial)

  async function handleToggle(sectionKey: OnboardingChecklistKey, index: number, checked: boolean) {
    // Optimistic update
    setChecklist((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((v, i) => (i === index ? checked : v)),
    }))

    const result = await updateOnboardingChecklist(clientId, sectionKey, index, checked)

    if (!result.success) {
      // Revert on failure
      setChecklist((prev) => ({
        ...prev,
        [sectionKey]: prev[sectionKey].map((v, i) => (i === index ? !checked : v)),
      }))
      toast.error(result.error ?? 'Failed to save')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-neutral-900">Onboarding Checklist</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6">
        {CHECKLIST_SECTIONS.map((section) => {
          const sectionChecked = checklist[section.key].filter(Boolean).length
          const sectionTotal = section.items.length
          return (
            <div key={section.key}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {section.title}
                </p>
                <span className="text-xs text-neutral-400 tabular-nums">
                  {sectionChecked}/{sectionTotal}
                </span>
              </div>
              <ul className="space-y-1">
                {section.items.map((item, index) => {
                  const isChecked = checklist[section.key][index] ?? false
                  // Sub-items in Section 2: indices 3 and 4 (the two nested items under "Lead delivery path")
                  const isSubItem = section.key === 'decide' && (index === 3 || index === 4)
                  return (
                    <li key={index} className={`flex items-start gap-2.5 ${isSubItem ? 'pl-5' : ''}`}>
                      <input
                        type="checkbox"
                        id={`${section.key}-${index}`}
                        checked={isChecked}
                        onChange={(e) => handleToggle(section.key, index, e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary accent-black cursor-pointer"
                      />
                      <label
                        htmlFor={`${section.key}-${index}`}
                        className={`text-sm leading-snug cursor-pointer select-none ${
                          isChecked ? 'line-through text-neutral-400' : 'text-neutral-700'
                        }`}
                      >
                        {item}
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
