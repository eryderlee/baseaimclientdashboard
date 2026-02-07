"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileText, Download, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface Document {
  id: string
  title: string
  fileName: string
  fileSize: number
  fileType: string
  status: string
  createdAt: Date
  fileUrl: string
}

interface DocumentListProps {
  documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {
  const router = useRouter()

  const deleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Delete failed")

      router.refresh()
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete document")
    }
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-neutral-400" />
        <p className="mt-4 text-sm text-neutral-500">
          No documents yet. Upload your first document above.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-neutral-500" />
                <span className="font-medium">{doc.title}</span>
              </div>
            </TableCell>
            <TableCell>
              {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  doc.status === "APPROVED"
                    ? "default"
                    : doc.status === "PENDING"
                    ? "secondary"
                    : "destructive"
                }
              >
                {doc.status}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(doc.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(doc.fileUrl, "_blank")}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteDocument(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
