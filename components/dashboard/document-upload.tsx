"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Upload, X, File } from "lucide-react"

export function DocumentUpload() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files))
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

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        setProgress(((i + 1) / files.length) * 100)
      }

      setFiles([])
      router.refresh()
    } catch (error) {
      console.error("Upload error:", error)
      alert("Failed to upload files. Please try again.")
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-8 text-center hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer"
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-neutral-400" />
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Drag and drop files here, or click to browse
        </p>
        <Input
          id="file-upload"
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

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
                    {(file.size / 1024 / 1024).toFixed(2)} MB
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
            {uploading ? "Uploading..." : `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  )
}
