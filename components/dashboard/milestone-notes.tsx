"use client";

import { MilestoneNote } from "@/lib/types/milestone";
import { formatDistanceToNow } from "date-fns";

interface MilestoneNotesProps {
  notes: MilestoneNote[];
}

export function MilestoneNotes({ notes }: MilestoneNotesProps) {
  if (notes.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {notes.map((note, index) => {
        const noteDate = new Date(note.createdAt);
        const isValidDate = !isNaN(noteDate.getTime());
        const relativeTime = isValidDate
          ? formatDistanceToNow(noteDate, { addSuffix: true })
          : "recently";

        return (
          <div
            key={`${note.id}-${index}`}
            className="text-sm text-muted-foreground border-l-2 border-muted pl-3 py-1"
          >
            <p className="text-foreground">{note.content}</p>
            <p className="text-xs mt-0.5">
              {relativeTime} by {note.createdBy}
            </p>
          </div>
        );
      })}
    </div>
  );
}
