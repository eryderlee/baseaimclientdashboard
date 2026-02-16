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
import { updateMilestones, deleteNote, updateNote } from "@/app/admin/clients/[clientId]/actions"
import { calculateMilestoneProgress } from "@/lib/utils/progress"
import { MilestoneStatus } from "@prisma/client"
import { X, Edit2, ChevronDown, ChevronUp } from "lucide-react"

type MilestoneData = {
  id: string
  title: string
  description: string | null
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED"
  dueDate: string | null
  startDate: string | null
  notes: unknown // Json field from Prisma -- stored as string[] array
  progress: number
  order: number
}

interface MilestoneEditTableProps {
  clientId: string
  initialMilestones: MilestoneData[]
}

export function MilestoneEditTable({
  clientId,
  initialMilestones,
}: MilestoneEditTableProps) {
  const router = useRouter()
  const [milestones, setMilestones] = useState<MilestoneData[]>(initialMilestones)
  const [newNotes, setNewNotes] = useState<Record<string, string>>(
    Object.fromEntries(initialMilestones.map((m) => [m.id, ""]))
  )
  const [hasChanges, setHasChanges] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [editingNote, setEditingNote] = useState<{ milestoneId: string; noteId: string; content: string } | null>(null)

  const handleStatusChange = (milestoneId: string, newStatus: MilestoneStatus) => {
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id !== milestoneId) return m

        // Auto-set startDate if transitioning TO IN_PROGRESS and no startDate exists
        const updatedStartDate =
          newStatus === "IN_PROGRESS" && !m.startDate
            ? new Date().toISOString()
            : m.startDate

        // Recalculate progress with new status
        const newProgress = calculateMilestoneProgress(
          newStatus,
          updatedStartDate ? new Date(updatedStartDate) : null,
          m.dueDate ? new Date(m.dueDate) : null
        )

        return {
          ...m,
          status: newStatus,
          startDate: updatedStartDate,
          progress: newProgress,
        }
      })
    )
    setHasChanges(true)
    setSuccess(false)
  }

  const handleDueDateChange = (milestoneId: string, newDueDate: string) => {
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id !== milestoneId) return m

        // Recalculate progress with new due date
        const newProgress = calculateMilestoneProgress(
          m.status as MilestoneStatus,
          m.startDate ? new Date(m.startDate) : null,
          newDueDate ? new Date(newDueDate) : null
        )

        return {
          ...m,
          dueDate: newDueDate || null,
          progress: newProgress,
        }
      })
    )
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
      } else {
        setEditingNote(null)
        window.location.reload()
      }
    })
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
  }

  const handleDeleteNote = async (milestoneId: string, noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    startTransition(async () => {
      const result = await deleteNote(clientId, milestoneId, noteId)

      if (result.error) {
        setError(result.error)
      } else {
        window.location.reload()
      }
    })
  }

  const handleSave = () => {
    startTransition(async () => {
      setError(null)
      setSuccess(false)

      const payload = {
        milestones: milestones.map((m) => ({
          id: m.id,
          status: m.status,
          dueDate: m.dueDate,
          newNote: newNotes[m.id]?.trim() || undefined,
        })),
      }

      const result = await updateMilestones(clientId, payload)

      if (result.error) {
        setError(result.error)
      } else {
        setHasChanges(false)
        setSuccess(true)
        // Clear all new notes
        setNewNotes(Object.fromEntries(milestones.map((m) => [m.id, ""])))
        // Refresh the page to show updated notes
        window.location.reload()
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
                                          <div className="flex gap-1 shrink-0">
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
      </CardContent>
    </Card>
  )
}
