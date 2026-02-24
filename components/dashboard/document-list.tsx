"use client"

import { useState } from "react"
import { toast } from "sonner"
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
import { FileText, Download, Trash2, Check, X } from "lucide-react"
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const deleteDocument = async (id: string) => {
    // First click: arm confirmation
    if (deletingId !== id) {
      setDeletingId(id)
      return
    }

    // Second click: confirmed
    setDeletingId(null)
    setLoadingId(id)
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Delete failed")

      toast.success("Document deleted")
      router.refresh()
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete document. Please try again.")
    } finally {
      setLoadingId(null)
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
              <div className="flex justify-end items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(`/api/documents/download/${doc.fileUrl}`, "_blank")}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {deletingId === doc.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-600 whitespace-nowrap">Delete?</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => deleteDocument(doc.id)}
                      disabled={loadingId === doc.id}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeletingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteDocument(doc.id)}
                    disabled={loadingId === doc.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
