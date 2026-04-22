'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { updateOnboardingChecklist, updateChecklistNote, sendClientActionLink } from '@/app/admin/actions'
import { KickoffFormSection } from '@/components/admin/kickoff-form-section'
import {
  CHECKLIST_SECTIONS,
  CHECKLIST_ITEM_NOTES,
  CHECKLIST_TOTAL,
  countChecked,
} from '@/types/onboarding'
import type {
  OnboardingChecklist,
  OnboardingChecklistKey,
  ChecklistNotes,
  ItemNoteConfig,
} from '@/types/onboarding'
import type { ClientIntake } from '@prisma/client'

interface OnboardingClientProps {
  clientId: string
  intake: ClientIntake | null
  initialChecklist: OnboardingChecklist
  initialNotes: ChecklistNotes
}

export function OnboardingClient({
  clientId,
  intake,
  initialChecklist,
  initialNotes,
}: OnboardingClientProps) {
  const [checklist, setChecklist] = useState<OnboardingChecklist>(initialChecklist)
  const [notes, setNotes] = useState<ChecklistNotes>(initialNotes)
  const [showDocRequest, setShowDocRequest] = useState(false)
  const [docRequestText, setDocRequestText] = useState('')
  const [docRequestState, setDocRequestState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function handleSendDocRequest() {
    if (!docRequestText.trim()) {
      toast.error('Describe what you need the client to upload.')
      return
    }
    setDocRequestState('sending')
    const result = await sendClientActionLink(clientId, 'documents', docRequestText.trim())
    if (result.success) {
      setDocRequestState('sent')
      toast.success('Document request sent')
    } else {
      setDocRequestState('idle')
      toast.error(result.error ?? 'Failed to send')
    }
  }
  const checkedCount = countChecked(checklist)
  const pct = Math.round((checkedCount / CHECKLIST_TOTAL) * 100)
  const complete = pct === 100

  // ─── Checkbox toggle ───────────────────────────────────────────────────────
  async function handleToggle(sectionKey: OnboardingChecklistKey, index: number, checked: boolean) {
    setChecklist((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((v, i) => (i === index ? checked : v)),
    }))
    const result = await updateOnboardingChecklist(clientId, sectionKey, index, checked)
    if (!result.success) {
      setChecklist((prev) => ({
        ...prev,
        [sectionKey]: prev[sectionKey].map((v, i) => (i === index ? !checked : v)),
      }))
      toast.error(result.error ?? 'Failed to save')
    }
  }

  // ─── Note: choice (immediate save) ────────────────────────────────────────
  async function handleNoteChoice(sectionKey: OnboardingChecklistKey, index: number, value: string) {
    setNotes((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] ?? {}), [index]: value },
    }))
    const result = await updateChecklistNote(clientId, sectionKey, index, value)
    if (!result.success) toast.error(result.error ?? 'Failed to save')
  }

  // ─── Note: text (save on blur) ─────────────────────────────────────────────
  async function handleNoteBlur(sectionKey: OnboardingChecklistKey, index: number, value: string) {
    const current = notes[sectionKey]?.[index] ?? ''
    if (value === current) return // no change
    setNotes((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] ?? {}), [index]: value },
    }))
    const result = await updateChecklistNote(clientId, sectionKey, index, value)
    if (!result.success) toast.error(result.error ?? 'Failed to save')
  }

  return (
    <div className="pb-24">
      {/* ─── Fixed bottom pill progress bar ────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[560px] max-w-[calc(100vw-2rem)] pointer-events-none">
        <div
          className="flex items-center gap-4 rounded-full px-6 py-3.5 pointer-events-auto shadow-2xl backdrop-blur-xl border border-white/25"
          style={{
            background: complete
              ? 'linear-gradient(135deg, rgba(5,150,105,0.85) 0%, rgba(16,185,129,0.85) 100%)'
              : 'linear-gradient(135deg, rgba(37,99,235,0.82) 0%, rgba(79,195,247,0.82) 55%, rgba(34,211,238,0.82) 100%)',
          }}
        >
          <span className="text-sm font-semibold shrink-0 text-white drop-shadow-sm">
            {complete ? '✓ Done' : 'Onboarding'}
          </span>
          <div className="flex-1">
            <Progress
              value={pct}
              className="h-2 bg-white/25 [&>div]:bg-white"
            />
          </div>
          <span className="text-sm tabular-nums font-medium shrink-0 text-white/90">
            {checkedCount}/{CHECKLIST_TOTAL}
          </span>
        </div>
      </div>

      {/* ─── Kickoff form ───────────────────────────────────────────────────── */}
      <div className="pt-8">
        <KickoffFormSection clientId={clientId} intake={intake} />
      </div>

      {/* ─── Divider ────────────────────────────────────────────────────────── */}
      <div className="border-t border-neutral-200 my-10" />

      {/* ─── Checklist ──────────────────────────────────────────────────────── */}
      <div className="space-y-10">
        <h2 className="text-lg font-semibold text-neutral-900">Onboarding Checklist</h2>

        {CHECKLIST_SECTIONS.map((section) => {
          const sectionChecked = checklist[section.key].filter(Boolean).length
          const sectionTotal = section.items.length

          return (
            <div key={section.key} className="space-y-3">
              {/* Section header */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                  {section.title}
                </p>
                <div className="flex items-center gap-3">
                  {section.key === 'collect' && (
                    <button
                      type="button"
                      onClick={() => { setShowDocRequest((v) => !v); setDocRequestState('idle') }}
                      className="text-xs font-medium text-neutral-500 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-400 rounded-md px-2.5 py-1 transition-colors"
                    >
                      {showDocRequest ? 'Cancel' : '+ Request docs'}
                    </button>
                  )}
                  <span className="text-xs text-neutral-400 tabular-nums">
                    {sectionChecked}/{sectionTotal}
                  </span>
                </div>
              </div>

              {/* Inline doc request form — only for Section 3 */}
              {section.key === 'collect' && showDocRequest && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 space-y-2">
                  <p className="text-xs font-medium text-neutral-600">What do you need the client to upload?</p>
                  <textarea
                    rows={2}
                    className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                    placeholder="e.g. Logo file (SVG or PNG), brand colour hex codes"
                    value={docRequestText}
                    onChange={(e) => setDocRequestText(e.target.value)}
                    disabled={docRequestState === 'sent'}
                  />
                  <button
                    type="button"
                    onClick={handleSendDocRequest}
                    disabled={docRequestState !== 'idle'}
                    className="text-sm font-medium px-4 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                  >
                    {docRequestState === 'sending' ? 'Sending…' : docRequestState === 'sent' ? 'Sent ✓' : 'Send magic link'}
                  </button>
                </div>
              )}

              {/* Items */}
              <ul className="space-y-2">
                {section.items.map((item, index) => {
                  const isChecked = checklist[section.key][index] ?? false
                  const noteConfig = CHECKLIST_ITEM_NOTES[section.key][index]
                  const noteValue = notes[section.key]?.[index] ?? ''

                  return (
                    <ChecklistItem
                      key={index}
                      sectionKey={section.key}
                      index={index}
                      label={item}
                      isChecked={isChecked}
                      noteConfig={noteConfig}
                      noteValue={noteValue}
                      onToggle={handleToggle}
                      onNoteChoice={handleNoteChoice}
                      onNoteBlur={handleNoteBlur}
                    />
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

// ─── ChecklistItem ────────────────────────────────────────────────────────────

interface ChecklistItemProps {
  sectionKey: OnboardingChecklistKey
  index: number
  label: string
  isChecked: boolean
  noteConfig: ItemNoteConfig
  noteValue: string
  onToggle: (key: OnboardingChecklistKey, index: number, checked: boolean) => void
  onNoteChoice: (key: OnboardingChecklistKey, index: number, value: string) => void
  onNoteBlur: (key: OnboardingChecklistKey, index: number, value: string) => void
}

function ChecklistItem({
  sectionKey,
  index,
  label,
  isChecked,
  noteConfig,
  noteValue,
  onToggle,
  onNoteChoice,
  onNoteBlur,
}: ChecklistItemProps) {
  const id = `${sectionKey}-${index}`
  const hasNote = noteConfig.type !== 'none'

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border px-4 py-3 transition-colors ${
        isChecked
          ? 'border-emerald-200 bg-emerald-50/40'
          : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'
      }`}
    >
      {/* Row: checkbox + label */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={id}
          checked={isChecked}
          onChange={(e) => onToggle(sectionKey, index, e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-neutral-300 accent-black cursor-pointer"
        />
        <label
          htmlFor={id}
          className={`text-base leading-relaxed cursor-pointer select-none ${
            isChecked ? 'line-through text-neutral-400' : 'text-neutral-800 font-medium'
          }`}
        >
          {label}
        </label>
      </div>

      {/* Note field */}
      {hasNote && (
        <div className="ml-8">
          {noteConfig.type === 'choice' && (
            <div className="flex flex-wrap gap-2">
              {noteConfig.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onNoteChoice(sectionKey, index, opt)}
                  className={`text-sm px-3 py-1 rounded-full border transition-all ${
                    noteValue === opt
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {noteConfig.type === 'text' && (
            <input
              type="text"
              defaultValue={noteValue}
              placeholder={noteConfig.placeholder}
              onBlur={(e) => onNoteBlur(sectionKey, index, e.target.value)}
              className="w-full text-sm border-0 border-b border-neutral-200 bg-transparent px-0 py-1 focus:outline-none focus:border-neutral-500 placeholder:text-neutral-400"
            />
          )}
        </div>
      )}
    </li>
  )
}
