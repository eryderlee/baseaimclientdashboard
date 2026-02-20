"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, X, File, FileText } from "lucide-react"

interface Document {
  id: string
  title: string
  fileName: string
  fileSize: number
  fileType: string
  status: string
  createdAt: string
}

interface ClientDocumentsProps {
  clientId: string
  documents: Document[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
      return "default"
    case "PENDING":
      return "secondary"
    case "REJECTED":
      return "destructive"
    default:
      return "outline"
  }
}

export function ClientDocuments({ clientId, documents }: ClientDocumentsProps) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
      setError(null)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files))
      setError(null)
    }
  }, [])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append("file", file)
        formData.append("clientId", clientId)

        const response = await fetch("/api/admin/documents/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Upload failed")
        }

        setProgress(((i + 1) / files.length) * 100)
      }

      setFiles([])
      router.refresh()
    } catch (err) {
      console.error("Upload error:", err)
      setError(
        err instanceof Error ? err.message : "Failed to upload files. Please try again."
      )
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upload Document</h3>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-8 text-center hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer"
          onClick={() => document.getElementById(`admin-file-upload-${clientId}`)?.click()}
        >
          <Upload className="mx-auto h-10 w-10 text-neutral-400" />
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Uploaded files go directly to this client&apos;s Google Drive folder
          </p>
          <Input
            id={`admin-file-upload-${clientId}`}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Selected Files:</p>
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <File className="h-5 w-5 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-neutral-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {uploading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-neutral-500">
                  Uploading... {Math.round(progress)}%
                </p>
              </div>
            )}

            <Button
              onClick={uploadFiles}
              disabled={uploading}
              className="w-full"
            >
              {uploading
                ? "Uploading..."
                : `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">
          Documents{" "}
          <span className="text-sm font-normal text-neutral-500">
            ({documents.length})
          </span>
        </h3>

        {documents.length === 0 ? (
          <div className="text-center py-8 border rounded-lg">
            <FileText className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="mt-2 text-sm text-neutral-500">No documents yet</p>
            <p className="text-xs text-neutral-400">
              Upload files above to add documents for this client
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-neutral-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-neutral-500">
                      {formatFileSize(doc.fileSize)} &middot; {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(doc.status)}>
                  {doc.status.charAt(0) + doc.status.slice(1).toLowerCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
