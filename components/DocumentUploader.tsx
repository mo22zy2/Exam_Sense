"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, type DragEvent } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

export function DocumentUploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<"lecture" | "exam">(
    "lecture",
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", documentType);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        setError(msg ?? "Upload failed.");
        return;
      }

      reset();
      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-scantron-line bg-scantron-paper p-6">
      <h3 className="mb-4 font-mono text-xs font-bold tracking-widest text-scantron-bubble">
        UPLOAD DOCUMENT
      </h3>

      <div
        role="button"
        tabIndex={0}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragging
            ? "border-scantron-bubble bg-scantron-bubble/5"
            : "border-scantron-line/60 hover:border-scantron-bubble/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {file ? (
          <>
            <FileText className="size-8 text-scantron-bubble/60" />
            <span className="max-w-full truncate text-sm font-medium text-scantron-bubble">
              {file.name}
            </span>
          </>
        ) : (
          <>
            <Upload className="size-8 text-scantron-bubble/40" />
            <span className="text-sm text-scantron-bubble/60">
              Drop PDF here or click to browse
            </span>
          </>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setDocumentType("lecture")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-mono text-xs font-bold tracking-wider transition-colors ${
            documentType === "lecture"
              ? "bg-scantron-bubble text-scantron-paper"
              : "border border-scantron-line/40 text-scantron-bubble/60 hover:bg-scantron-bubble/5"
          }`}
        >
          LECTURE
        </button>
        <button
          type="button"
          onClick={() => setDocumentType("exam")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-mono text-xs font-bold tracking-wider transition-colors ${
            documentType === "exam"
              ? "bg-scantron-bubble text-scantron-paper"
              : "border border-scantron-line/40 text-scantron-bubble/60 hover:bg-scantron-bubble/5"
          }`}
        >
          EXAM
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-scantron-red">{error}</p>
      )}

      <button
        type="button"
        disabled={!file || uploading}
        onClick={handleUpload}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-scantron-bubble px-4 py-2.5 text-sm font-bold text-scantron-paper transition-opacity disabled:opacity-40"
      >
        {uploading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            UPLOADING…
          </>
        ) : (
          <>
            <Upload className="size-4" />
            UPLOAD
          </>
        )}
      </button>
    </div>
  );
}
