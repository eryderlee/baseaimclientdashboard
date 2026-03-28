"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { updateMilestones, deleteNote, updateNote, addGrowthMilestone, removeGrowthMilestone, addSetupMilestone } from "@/app/admin/clients/[clientId]/actions"
import { calculateMilestoneProgress } from "@/lib/utils/progress"
import { MilestoneStatus } from "@prisma/client"
import { toast } from "sonner"
import { X, Check, Edit2, ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react"

type MilestoneData = {
  id: string
  title: string
  description: string | null
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED"
  milestoneType?: "SETUP" | "GROWTH"
  dueDate: string | null
  startDate: string | null
  notes: unknown // Json field from Prisma -- stored as string[] array
  progress: number
  order: number
}

type GrowthMilestoneData = {
  id: string
  title: string
  description: string | null
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED"
  milestoneType: "SETUP" | "GROWTH"
  dueDate: string | null
  startDate: string | null
  notes: unknown
  progress: number
  order: number
}

interface MilestoneEditTableProps {
  clientId: string
  initialMilestones: MilestoneData[]
  growthMilestones?: GrowthMilestoneData[]
}

export function MilestoneEditTable({
  clientId,
  initialMilestones,
  growthMilestones: initialGrowthMilestones,
}: MilestoneEditTableProps) {
  const router = useRouter()
  const [milestones, setMilestones] = useState<MilestoneData[]>(initialMilestones)
  const [growthMilestones, setGrowthMilestones] = useState<MilestoneData[]>(
    (initialGrowthMilestones ?? []) as MilestoneData[]
  )
  const [growthTitle, setGrowthTitle] = useState("")
  const [growthDueDate, setGrowthDueDate] = useState("")
  const [isGrowthPending, startGrowthTransition] = useTransition()
  const [setupTitle, setSetupTitle] = useState("")
  const [setupDueDate, setSetupDueDate] = useState("")
  const [isSetupPending, startSetupTransition] = useTransition()
  const allMilestones = [...milestones, ...growthMilestones]
  const [newNotes, setNewNotes] = useState<Record<string, string>>(
    Object.fromEntries(allMilestones.map((m) => [m.id, ""]))
  )
  const [hasChanges, setHasChanges] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [editingNote, setEditingNote] = useState<{ milestoneId: string; noteId: string; content: string } | null>(null)
  const [deletingNoteId, setDeletingNoteId] = useState<{ milestoneId: string; noteId: string } | null>(null)

  const updateMilestoneInList = (
    setter: typeof setMilestones,
    milestoneId: string,
    updater: (m: MilestoneData) => MilestoneData
  ) => {
    setter((prev) => {
      const idx = prev.findIndex((m) => m.id === milestoneId)
      if (idx === -1) return prev
      return prev.map((m) => (m.id === milestoneId ? updater(m) : m))
    })
  }

  const findMilestoneList = (milestoneId: string) => {
    if (milestones.some((m) => m.id === milestoneId)) return setMilestones
    if (growthMilestones.some((m) => m.id === milestoneId)) return setGrowthMilestones
    return null
  }

  const handleStatusChange = (milestoneId: string, newStatus: MilestoneStatus) => {
    const setter = findMilestoneList(milestoneId)
    if (!setter) return

    updateMilestoneInList(setter, milestoneId, (m) => {
      const updatedStartDate =
        newStatus === "IN_PROGRESS" && !m.startDate
          ? new Date().toISOString()
          : m.startDate

      const newProgress = calculateMilestoneProgress(
        newStatus,
        updatedStartDate ? new Date(updatedStartDate) : null,
        m.dueDate ? new Date(m.dueDate) : null
      )

      return { ...m, status: newStatus, startDate: updatedStartDate, progress: newProgress }
    })
    setHasChanges(true)
    setSuccess(false)
  }

  const handleDueDateChange = (milestoneId: string, newDueDate: string) => {
    const setter = findMilestoneList(milestoneId)
    if (!setter) return

    updateMilestoneInList(setter, milestoneId, (m) => {
      const newProgress = calculateMilestoneProgress(
        m.status as MilestoneStatus,
        m.startDate ? new Date(m.startDate) : null,
        newDueDate ? new Date(newDueDate) : null
      )
      return { ...m, dueDate: newDueDate || null, progress: newProgress }
    })
    setHasChanges(true)
    setSuccess(false)
  }

  const handleNoteChange = (milestoneId: string, note: string) => {
    setNewNotes((prev) => ({ ...prev, [milestoneId]: note }))
    setHasChanges(true)
    setSuccess(false)
  }

  const toggleNotesExpanded = (milestoneId: string) => {
    setExpandedNotes((prev) => ({ ...prev, [milestoneId]: !prev[milestoneId] }))
  }

  const handleEditNote = (milestoneId: string, noteId: string, content: string) => {
    setEditingNote({ milestoneId, noteId, content })
  }

  const handleSaveEditedNote = async () => {
    if (!editingNote) return

    startTransition(async () => {
      const result = await updateNote(clientId, editingNote.milestoneId, editingNote.noteId, editingNote.content)

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        // Update local state so the edited content shows immediately
        const updateNoteInList = (prev: MilestoneData[]) =>
          prev.map((m) => {
            if (m.id !== editingNote.milestoneId) return m
            const notes = Array.isArray(m.notes) ? m.notes : []
            return {
              ...m,
              notes: notes.map((note: any) => {
                const id = note?.id ?? note
                if (id !== editingNote.noteId) return note
                return typeof note === 'object' ? { ...note, content: editingNote.content } : editingNote.content
              }),
            }
          })
        setMilestones(updateNoteInList)
        setGrowthMilestones(updateNoteInList)
        setEditingNote(null)
        toast.success("Note updated")
        router.refresh()
      }
    })
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
  }

  const handleDeleteNote = async (milestoneId: string, noteId: string) => {
    // First click: arm the confirmation
    if (deletingNoteId?.noteId !== noteId) {
      setDeletingNoteId({ milestoneId, noteId })
      return
    }

    // Second click: confirmed — execute deletion
    setDeletingNoteId(null)
    startTransition(async () => {
      const result = await deleteNote(clientId, milestoneId, noteId)

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        // Remove from local state so it disappears immediately
        const removeNoteFromList = (prev: MilestoneData[]) =>
          prev.map((m) => {
            if (m.id !== milestoneId) return m
            const notes = Array.isArray(m.notes) ? m.notes : []
            return {
              ...m,
              notes: notes.filter((note: any) => (note?.id ?? note) !== noteId),
            }
          })
        setMilestones(removeNoteFromList)
        setGrowthMilestones(removeNoteFromList)
        toast.success("Note deleted")
        router.refresh()
      }
    })
  }

  const handleSave = () => {
    startTransition(async () => {
      setError(null)
      setSuccess(false)

      const allToSave = [...milestones, ...growthMilestones]
      const payload = {
        milestones: allToSave.map((m) => ({
          id: m.id,
          status: m.status,
          dueDate: m.dueDate,
          newNote: newNotes[m.id]?.trim() || undefined,
        })),
      }

      const result = await updateMilestones(clientId, payload)

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        setHasChanges(false)
        setSuccess(true)
        setNewNotes(Object.fromEntries(allToSave.map((m) => [m.id, ""])))
        toast.success("Milestones saved")
        router.refresh()
      }
    })
  }

  const handleAddGrowthMilestone = () => {
    const trimmedTitle = growthTitle.trim()
    if (!trimmedTitle) return

    startGrowthTransition(async () => {
      // Convert date input (YYYY-MM-DD) to ISO datetime if provided
      const dueDateIso = growthDueDate
        ? new Date(growthDueDate).toISOString()
        : undefined

      const result = await addGrowthMilestone(clientId, {
        title: trimmedTitle,
        dueDate: dueDateIso ?? null,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Growth milestone added")
        setGrowthTitle("")
        setGrowthDueDate("")
        router.refresh()
      }
    })
  }

  const handleRemoveGrowthMilestone = (milestoneId: string) => {
    if (!window.confirm("Remove this growth milestone?")) return

    startGrowthTransition(async () => {
      const result = await removeGrowthMilestone(clientId, milestoneId)

      if (result.error) {
        toast.error(result.error)
      } else {
        setGrowthMilestones((prev) => prev.filter((m) => m.id !== milestoneId))
        toast.success("Milestone removed")
        router.refresh()
      }
    })
  }

  const handleAddSetupMilestone = () => {
    const trimmedTitle = setupTitle.trim()
    if (!trimmedTitle) return

    startSetupTransition(async () => {
      const dueDateIso = setupDueDate
        ? new Date(setupDueDate).toISOString()
        : undefined

      const result = await addSetupMilestone(clientId, {
        title: trimmedTitle,
        dueDate: dueDateIso ?? null,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Setup milestone added")
        setSetupTitle("")
        setSetupDueDate("")
        router.refresh()
      }
    })
  }

  const getProgressColor = (progress: number) => {
    if (progress === 100) return "text-green-600"
    if (progress >= 50) return "text-yellow-600"
    return "text-neutral-500"
  }

  const getProgressBgColor = (progress: number) => {
    if (progress === 100) return "bg-green-100"
    if (progress >= 50) return "bg-yellow-100"
    return "bg-neutral-100"
  }

  return (
    <Card className="max-w-6xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Edit Milestones</CardTitle>
          <div className="flex items-center gap-3">
            {hasChanges && !success && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                Unsaved changes
              </Badge>
            )}
            {success && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Changes saved
              </Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isPending}
              variant={hasChanges ? "default" : "secondary"}
            >
              {isPending ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-600 mt-2">Error: {error}</p>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-48">Milestone</TableHead>
              <TableHead className="w-40">Status</TableHead>
              <TableHead className="w-40">Due Date</TableHead>
              <TableHead className="min-w-64">Notes</TableHead>
              <TableHead className="w-32">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.map((milestone) => {
              // Handle notes as MilestoneNote objects or fallback to strings
              const notesArray = Array.isArray(milestone.notes)
                ? milestone.notes
                : []

              // Get latest note - handle both object and string formats
              let latestNoteContent: string | null = null
              if (notesArray.length > 0) {
                const lastNote = notesArray[notesArray.length - 1]
                if (typeof lastNote === 'string') {
                  latestNoteContent = lastNote
                } else if (lastNote && typeof lastNote === 'object' && 'content' in lastNote) {
                  latestNoteContent = (lastNote as any).content
                }
              }

              return (
                <TableRow key={milestone.id}>
                  {/* Order */}
                  <TableCell className="font-medium text-neutral-500">
                    {milestone.order}
                  </TableCell>

                  {/* Milestone Title */}
                  <TableCell className="font-semibold">
                    {milestone.title}
                  </TableCell>

                  {/* Status Dropdown */}
                  <TableCell>
                    <select
                      value={milestone.status}
                      onChange={(e) =>
                        handleStatusChange(
                          milestone.id,
                          e.target.value as MilestoneStatus
                        )
                      }
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  </TableCell>

                  {/* Due Date Picker */}
                  <TableCell>
                    <input
                      type="date"
                      value={
                        milestone.dueDate
                          ? milestone.dueDate.split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        handleDueDateChange(milestone.id, e.target.value)
                      }
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </TableCell>

                  {/* Notes */}
                  <TableCell>
                    <div className="space-y-2">
                      {/* Existing Notes List */}
                      {notesArray.length > 0 && (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => toggleNotesExpanded(milestone.id)}
                            className="flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-800"
                          >
                            {expandedNotes[milestone.id] ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                            {notesArray.length} note{notesArray.length !== 1 ? 's' : ''}
                          </button>

                          {expandedNotes[milestone.id] && (
                            <div className="space-y-1 max-h-60 overflow-y-auto">
                              {notesArray.map((note, noteIndex) => {
                                const noteObj = typeof note === 'object' && note !== null ? note as any : null
                                // For old format (strings), use the content as the ID for deletion
                                // For new format (objects), use the actual ID
                                const noteId = noteObj?.id || (typeof note === 'string' ? note : `note-${noteIndex}`)
                                const content = noteObj?.content || (typeof note === 'string' ? note : '')
                                const createdAt = noteObj?.createdAt
                                const createdBy = noteObj?.createdBy

                                const isEditing = editingNote?.milestoneId === milestone.id && editingNote?.noteId === noteId

                                return (
                                  <div
                                    key={noteId}
                                    className="rounded bg-neutral-100 px-2 py-1.5 text-xs"
                                  >
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={editingNote.content}
                                          onChange={(e) =>
                                            setEditingNote({ ...editingNote, content: e.target.value })
                                          }
                                          className="w-full rounded border border-neutral-300 px-2 py-1 text-xs resize-none"
                                          rows={2}
                                        />
                                        <div className="flex gap-1">
                                          <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleSaveEditedNote}
                                            disabled={isPending}
                                            className="h-6 text-xs px-2"
                                          >
                                            Save
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                            disabled={isPending}
                                            className="h-6 text-xs px-2"
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-start justify-between gap-2">
                                          <p className="flex-1 text-neutral-700">{content}</p>
                                          <div className="flex gap-1 shrink-0 items-center">
                                            {deletingNoteId?.noteId === noteId ? (
                                              <>
                                                <span className="text-xs text-red-600">Delete?</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteNote(milestone.id, noteId)}
                                                  className="text-red-600 hover:text-red-800"
                                                  title="Confirm delete"
                                                >
                                                  <Check className="h-3 w-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setDeletingNoteId(null)}
                                                  className="text-neutral-500 hover:text-neutral-700"
                                                  title="Cancel"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => handleEditNote(milestone.id, noteId, content)}
                                                  className="text-neutral-500 hover:text-blue-600"
                                                  title="Edit note"
                                                >
                                                  <Edit2 className="h-3 w-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteNote(milestone.id, noteId)}
                                                  className="text-neutral-500 hover:text-red-600"
                                                  title="Delete note"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        {(createdAt || createdBy) && (
                                          <p className="text-neutral-500 mt-1">
                                            {createdBy && <span>{createdBy}</span>}
                                            {createdAt && createdBy && <span> • </span>}
                                            {createdAt && (
                                              <span>
                                                {new Date(createdAt).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric',
                                                  hour: 'numeric',
                                                  minute: '2-digit',
                                                })}
                                              </span>
                                            )}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Add New Note */}
                      <div>
                        <label className="text-xs font-medium text-neutral-600 mb-1 block">
                          Add New Note:
                        </label>
                        <textarea
                          value={newNotes[milestone.id] || ""}
                          onChange={(e) =>
                            handleNoteChange(milestone.id, e.target.value)
                          }
                          placeholder="Type a new note..."
                          rows={2}
                          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        />
                      </div>
                    </div>
                  </TableCell>

                  {/* Progress (Read-only) */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getProgressBgColor(
                          milestone.progress
                        )} ${getProgressColor(milestone.progress)}`}
                      >
                        {milestone.progress}%
                      </div>
                      <div className="h-2 w-12 rounded-full bg-neutral-200">
                        <div
                          className={`h-2 rounded-full ${
                            milestone.progress === 100
                              ? "bg-green-600"
                              : milestone.progress >= 50
                              ? "bg-yellow-500"
                              : "bg-neutral-400"
                          }`}
                          style={{ width: `${milestone.progress}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* Add custom setup phase */}
        <div className="flex items-end gap-3 mt-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-neutral-600 mb-1 block">
              Add Custom Phase
            </label>
            <input
              type="text"
              value={setupTitle}
              onChange={(e) => setSetupTitle(e.target.value)}
              placeholder="e.g. Website Redesign"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-1 block">
              Due Date (optional)
            </label>
            <input
              type="date"
              value={setupDueDate}
              onChange={(e) => setSetupDueDate(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button
            type="button"
            onClick={handleAddSetupMilestone}
            disabled={isSetupPending || !setupTitle.trim()}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            {isSetupPending ? "Adding..." : "Add Phase"}
          </Button>
        </div>
      </CardContent>

      {initialGrowthMilestones !== undefined && (
        <>
          <CardHeader className="pt-0 border-t border-neutral-100 mt-2">
            <div>
              <CardTitle>Post-Setup Milestones</CardTitle>
              <p className="text-sm text-neutral-500 mt-1">
                Ongoing monthly review roadmap
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add form */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-neutral-600 mb-1 block">
                  Title
                </label>
                <input
                  type="text"
                  value={growthTitle}
                  onChange={(e) => setGrowthTitle(e.target.value)}
                  placeholder="e.g. April 2026 Monthly Review"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 mb-1 block">
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  value={growthDueDate}
                  onChange={(e) => setGrowthDueDate(e.target.value)}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddGrowthMilestone}
                disabled={isGrowthPending || !growthTitle.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                {isGrowthPending ? "Adding..." : "Add"}
              </Button>
            </div>

            {/* Post-setup milestones list */}
            {growthMilestones.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center">
                <p className="text-sm font-medium text-neutral-500">
                  No post-setup milestones yet.
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Complete all setup phases to auto-generate the monthly roadmap, or add one manually above.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-48">Milestone</TableHead>
                    <TableHead className="w-40">Status</TableHead>
                    <TableHead className="w-40">Due Date</TableHead>
                    <TableHead className="min-w-64">Notes</TableHead>
                    <TableHead className="w-32">Progress</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {growthMilestones.map((milestone) => {
                    const notesArray = Array.isArray(milestone.notes) ? milestone.notes : []
                    return (
                      <TableRow key={milestone.id}>
                        <TableCell className="font-medium text-neutral-500">
                          {milestone.order}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {milestone.title}
                        </TableCell>
                        <TableCell>
                          <select
                            value={milestone.status}
                            onChange={(e) =>
                              handleStatusChange(milestone.id, e.target.value as MilestoneStatus)
                            }
                            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="BLOCKED">Blocked</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <input
                            type="date"
                            value={milestone.dueDate ? milestone.dueDate.split("T")[0] : ""}
                            onChange={(e) => handleDueDateChange(milestone.id, e.target.value)}
                            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {notesArray.length > 0 && (
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => toggleNotesExpanded(milestone.id)}
                                  className="flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-800"
                                >
                                  {expandedNotes[milestone.id] ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                  {notesArray.length} note{notesArray.length !== 1 ? 's' : ''}
                                </button>
                                {expandedNotes[milestone.id] && (
                                  <div className="space-y-1 max-h-60 overflow-y-auto">
                                    {notesArray.map((note, noteIndex) => {
                                      const noteObj = typeof note === 'object' && note !== null ? note as any : null
                                      const noteId = noteObj?.id || (typeof note === 'string' ? note : `note-${noteIndex}`)
                                      const content = noteObj?.content || (typeof note === 'string' ? note : '')
                                      const createdAt = noteObj?.createdAt
                                      const createdBy = noteObj?.createdBy
                                      const isEditing = editingNote?.milestoneId === milestone.id && editingNote?.noteId === noteId

                                      return (
                                        <div key={noteId} className="rounded bg-neutral-100 px-2 py-1.5 text-xs">
                                          {isEditing ? (
                                            <div className="space-y-2">
                                              <textarea
                                                value={editingNote.content}
                                                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                                                className="w-full rounded border border-neutral-300 px-2 py-1 text-xs resize-none"
                                                rows={2}
                                              />
                                              <div className="flex gap-1">
                                                <Button type="button" size="sm" onClick={handleSaveEditedNote} disabled={isPending} className="h-6 text-xs px-2">Save</Button>
                                                <Button type="button" size="sm" variant="outline" onClick={handleCancelEdit} disabled={isPending} className="h-6 text-xs px-2">Cancel</Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="flex items-start justify-between gap-2">
                                                <p className="flex-1 text-neutral-700">{content}</p>
                                                <div className="flex gap-1 shrink-0 items-center">
                                                  {deletingNoteId?.noteId === noteId ? (
                                                    <>
                                                      <span className="text-xs text-red-600">Delete?</span>
                                                      <button type="button" onClick={() => handleDeleteNote(milestone.id, noteId)} className="text-red-600 hover:text-red-800" title="Confirm delete"><Check className="h-3 w-3" /></button>
                                                      <button type="button" onClick={() => setDeletingNoteId(null)} className="text-neutral-500 hover:text-neutral-700" title="Cancel"><X className="h-3 w-3" /></button>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <button type="button" onClick={() => handleEditNote(milestone.id, noteId, content)} className="text-neutral-500 hover:text-blue-600" title="Edit note"><Edit2 className="h-3 w-3" /></button>
                                                      <button type="button" onClick={() => handleDeleteNote(milestone.id, noteId)} className="text-neutral-500 hover:text-red-600" title="Delete note"><X className="h-3 w-3" /></button>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                              {(createdAt || createdBy) && (
                                                <p className="text-neutral-500 mt-1">
                                                  {createdBy && <span>{createdBy}</span>}
                                                  {createdAt && createdBy && <span> • </span>}
                                                  {createdAt && <span>{new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                                                </p>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              <label className="text-xs font-medium text-neutral-600 mb-1 block">Add New Note:</label>
                              <textarea
                                value={newNotes[milestone.id] || ""}
                                onChange={(e) => handleNoteChange(milestone.id, e.target.value)}
                                placeholder="Type a new note..."
                                rows={2}
                                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`rounded-full px-2 py-1 text-xs font-medium ${getProgressBgColor(milestone.progress)} ${getProgressColor(milestone.progress)}`}>
                              {milestone.progress}%
                            </div>
                            <div className="h-2 w-12 rounded-full bg-neutral-200">
                              <div
                                className={`h-2 rounded-full ${milestone.progress === 100 ? "bg-green-600" : milestone.progress >= 50 ? "bg-yellow-500" : "bg-neutral-400"}`}
                                style={{ width: `${milestone.progress}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveGrowthMilestone(milestone.id)}
                            disabled={isGrowthPending}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            title="Remove milestone"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </>
      )}
    </Card>
  )
}
