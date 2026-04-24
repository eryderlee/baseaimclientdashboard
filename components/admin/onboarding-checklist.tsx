'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { updateOnboardingChecklist, updateChecklistNote, sendClientActionLink } from '@/app/admin/actions'
import { KickoffFormSection } from '@/components/admin/kickoff-form-section'
import {
  CHECKLIST_SECTIONS,
  CHECKLIST_ITEM_NOTES,
  CHECKLIST_ITEM_CHASE_TEMPLATES,
  computeActiveTotal,
  countChecked,
  isItemActive,
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

  const activeTotal = computeActiveTotal(notes)
  const checkedCount = countChecked(checklist, notes)
  const pct = activeTotal > 0 ? Math.round((checkedCount / activeTotal) * 100) : 0
  const complete = activeTotal > 0 && checkedCount >= activeTotal

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
  async function handleNoteChoice(sectionKey: OnboardingChecklistKey, key: string, value: string) {
    setNotes((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] ?? {}), [key]: value },
    }))
    const result = await updateChecklistNote(clientId, sectionKey, key, value)
    if (!result.success) toast.error(result.error ?? 'Failed to save')
  }

  // ─── Note: text (save on blur) ─────────────────────────────────────────────
  async function handleNoteBlur(sectionKey: OnboardingChecklistKey, key: string, value: string) {
    const current = notes[sectionKey]?.[key] ?? ''
    if (value === current) return
    setNotes((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] ?? {}), [key]: value },
    }))
    const result = await updateChecklistNote(clientId, sectionKey, key, value)
    if (!result.success) toast.error(result.error ?? 'Failed to save')
  }

  return (
    <div className="pb-24">
      {/* ─── Fixed bottom pill progress bar ────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[560px] max-w-[calc(100vw-2rem)] pointer-events-none">
        <div
          className={`flex items-center gap-4 rounded-full border shadow-2xl px-6 py-3.5 backdrop-blur-md pointer-events-auto transition-colors duration-300 ${
            complete
              ? 'bg-emerald-950/90 border-emerald-700'
              : 'bg-neutral-900/90 border-neutral-700'
          }`}
        >
          <span className={`text-sm font-semibold shrink-0 ${complete ? 'text-emerald-300' : 'text-white'}`}>
            {complete ? '✓ Done' : 'Onboarding'}
          </span>
          <div className="flex-1">
            <Progress
              value={pct}
              className={`h-2 bg-white/20 ${complete ? '[&>div]:bg-emerald-400' : '[&>div]:bg-white'}`}
            />
          </div>
          <span className={`text-sm tabular-nums font-medium shrink-0 ${complete ? 'text-emerald-300' : 'text-white/80'}`}>
            {checkedCount}/{activeTotal}
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
          const sectionActiveItems = section.items.filter((_, i) => isItemActive(section.key, i, notes))
          const sectionChecked = checklist[section.key].filter((checked, i) => checked && isItemActive(section.key, i, notes)).length
          const sectionTotal = sectionActiveItems.length
          const isSetupSection = section.key === 'setup'
          const isPostcallSection = section.key === 'postcall'

          return (
            <div key={section.key} className="space-y-3">
              {/* Section header */}
              <div className={`flex items-center justify-between ${isPostcallSection ? 'mt-4' : ''}`}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                    {section.title}
                  </p>
                  {section.subtitle && (
                    <p className="text-xs text-neutral-400 mt-0.5 max-w-xl">{section.subtitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {isSetupSection && (
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

              {/* Section 7 — Post-call visual distinction */}
              {isPostcallSection && (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 px-4 pt-2 pb-1 -mx-1">
                  <p className="text-xs text-neutral-400 mb-3">
                    Client self-serve actions — items grey out if not triggered by Section 3 choices
                  </p>
                </div>
              )}

              {/* Inline doc request form — only for Section 3 */}
              {isSetupSection && showDocRequest && (
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
              <ul className={`space-y-2 ${isPostcallSection ? '-mt-1' : ''}`}>
                {section.items.map((item, index) => {
                  const active = isItemActive(section.key, index, notes)
                  const isChecked = checklist[section.key][index] ?? false
                  const noteConfig = CHECKLIST_ITEM_NOTES[section.key][index]
                  const noteValue = notes[section.key]?.[String(index)] ?? ''
                  const chaseTemplate = CHECKLIST_ITEM_CHASE_TEMPLATES[section.key]?.[index]
                  const showChase = active && !isChecked && chaseTemplate

                  return (
                    <ChecklistItem
                      key={index}
                      clientId={clientId}
                      sectionKey={section.key}
                      index={index}
                      label={item}
                      isChecked={isChecked}
                      isActive={active}
                      noteConfig={noteConfig}
                      noteValue={noteValue}
                      notes={notes}
                      chaseTemplate={showChase ? chaseTemplate : undefined}
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
  clientId: string
  sectionKey: OnboardingChecklistKey
  index: number
  label: string
  isChecked: boolean
  isActive: boolean
  noteConfig: ItemNoteConfig
  noteValue: string
  notes: ChecklistNotes
  chaseTemplate?: string
  onToggle: (key: OnboardingChecklistKey, index: number, checked: boolean) => void
  onNoteChoice: (key: OnboardingChecklistKey, noteKey: string, value: string) => void
  onNoteBlur: (key: OnboardingChecklistKey, noteKey: string, value: string) => void
}

function ChecklistItem({
  clientId,
  sectionKey,
  index,
  label,
  isChecked,
  isActive,
  noteConfig,
  noteValue,
  notes,
  chaseTemplate,
  onToggle,
  onNoteChoice,
  onNoteBlur,
}: ChecklistItemProps) {
  const [copied, setCopied] = useState(false)
  const [magicLinkState, setMagicLinkState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const id = `${sectionKey}-${index}`
  const hasNote = noteConfig.type !== 'none'

  // Determine if this item has an inline magic link button
  // setup[7] = brand assets magic link (documents action)
  // book[3] = dashboard magic link (password action)
  const hasMagicLink = (sectionKey === 'setup' && index === 7) || (sectionKey === 'book' && index === 3)
  const magicLinkAction = sectionKey === 'setup' ? 'documents' : 'password'

  async function handleMagicLink() {
    setMagicLinkState('sending')
    const result = await sendClientActionLink(clientId, magicLinkAction as 'documents' | 'password')
    if (result.success) {
      setMagicLinkState('sent')
      toast.success('Magic link sent')
    } else {
      setMagicLinkState('idle')
      toast.error(result.error ?? 'Failed to send')
    }
  }

  async function handleCopyChase() {
    if (!chaseTemplate) return
    await navigator.clipboard.writeText(chaseTemplate)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isActive) {
    return (
      <li className="flex items-start gap-3 rounded-xl border border-dashed border-neutral-200 px-4 py-3 opacity-40">
        <input
          type="checkbox"
          disabled
          checked={false}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-neutral-300 cursor-not-allowed"
          readOnly
        />
        <span className="text-base text-neutral-400 select-none">{label}</span>
      </li>
    )
  }

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
        <div className="flex-1 min-w-0">
          <label
            htmlFor={id}
            className={`text-base leading-relaxed cursor-pointer select-none ${
              isChecked ? 'line-through text-neutral-400' : 'text-neutral-800 font-medium'
            }`}
          >
            {label}
          </label>
        </div>
        {/* Magic link button */}
        {hasMagicLink && (
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={magicLinkState !== 'idle'}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-600 hover:border-neutral-500 hover:text-neutral-900 disabled:opacity-50 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            {magicLinkState === 'sending' ? 'Sending…' : magicLinkState === 'sent' ? 'Sent ✓' : 'Send magic link'}
          </button>
        )}
      </div>

      {/* Note field */}
      {hasNote && (
        <div className="ml-8">
          {(noteConfig.type === 'choice' || noteConfig.type === 'choice-with-conditional') && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {noteConfig.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onNoteChoice(sectionKey, String(index), opt)}
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
              {/* Conditional text field for choice-with-conditional */}
              {noteConfig.type === 'choice-with-conditional' &&
                noteValue &&
                noteConfig.conditionalNotes[noteValue] && (
                  <input
                    type="text"
                    key={`${sectionKey}-${index}-${noteValue}`}
                    defaultValue={notes[sectionKey]?.[`${index}_note`] ?? ''}
                    placeholder={noteConfig.conditionalNotes[noteValue]}
                    onBlur={(e) => onNoteBlur(sectionKey, `${index}_note`, e.target.value)}
                    className="w-full text-sm border-0 border-b border-neutral-200 bg-transparent px-0 py-1 focus:outline-none focus:border-neutral-500 placeholder:text-neutral-400"
                  />
                )}
            </div>
          )}

          {noteConfig.type === 'text' && (
            <input
              type="text"
              defaultValue={noteValue}
              placeholder={noteConfig.placeholder}
              onBlur={(e) => onNoteBlur(sectionKey, String(index), e.target.value)}
              className="w-full text-sm border-0 border-b border-neutral-200 bg-transparent px-0 py-1 focus:outline-none focus:border-neutral-500 placeholder:text-neutral-400"
            />
          )}
        </div>
      )}

      {/* Chase template — shown when item is active but unchecked */}
      {chaseTemplate && (
        <div className="ml-8 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 space-y-1.5">
          <p className="text-xs font-medium text-amber-700">Chase template</p>
          <p className="text-xs text-amber-800 leading-relaxed whitespace-pre-wrap">{chaseTemplate}</p>
          <button
            type="button"
            onClick={handleCopyChase}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </li>
  )
}
