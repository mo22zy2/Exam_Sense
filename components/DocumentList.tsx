"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, FileText, AlertCircle } from "lucide-react";

type Document = {
  id: string;
  file_name: string;
  document_type: "lecture" | "exam";
  status: string;
  file_size_bytes: number;
  created_at: string;
};

type DocumentListProps = {
  documents: Document[];
  loading: boolean;
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusStyle(status: string): string {
  switch (status) {
    case "pending":
      return "text-scantron-bubble/40 border-scantron-line/30 bg-scantron-line/10";
    case "queued":
      return "text-scantron-bubble/60 border-scantron-line/50 bg-scantron-line/20";
    case "processing":
      return "text-scantron-bubble border-scantron-bubble/30 bg-scantron-bubble/5";
    case "processed":
      return "text-scantron-bubble/80 border-scantron-bubble/20 bg-scantron-bubble/5";
    case "failed":
      return "text-scantron-red border-scantron-red/30 bg-scantron-red/5";
    default:
      return "text-scantron-bubble/40 border-scantron-line/30 bg-scantron-line/10";
  }
}

export function DocumentList({ documents, loading }: DocumentListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`Delete "${doc.file_name}"? This cannot be undone.`))
      return;

    setDeletingId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "DELETE",
      });

      if (res.status === 409) {
        const { error: msg } = await res.json();
        alert(msg ?? "Cannot delete a document that is being processed.");
        return;
      }

      if (!res.ok) {
        alert("Failed to delete document.");
        return;
      }

      router.refresh();
    } catch {
      alert("Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-scantron-bubble/40">
        <div className="size-3 animate-pulse rounded-full border border-scantron-line bg-scantron-line/20" />
        Loading documents…
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <FileText className="size-10 text-scantron-line/40" />
        <p className="text-sm text-scantron-bubble/40">
          No documents yet. Upload a PDF to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 rounded-lg border border-scantron-line/30 bg-scantron-paper px-4 py-3"
        >
          <FileText className="size-5 shrink-0 text-scantron-bubble/30" />

          <span className="min-w-0 flex-1 truncate text-sm font-medium text-scantron-bubble">
            {doc.file_name}
          </span>

          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider ${
              doc.document_type === "lecture"
                ? "border-scantron-bubble/20 bg-scantron-bubble/10 text-scantron-bubble"
                : "border-scantron-line/30 bg-scantron-line/30 text-scantron-bubble/60"
            }`}
          >
            {doc.document_type}
          </span>

          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider ${statusStyle(doc.status)}`}
          >
            {doc.status}
          </span>

          <span className="shrink-0 font-mono text-[11px] text-scantron-bubble/40">
            {formatSize(doc.file_size_bytes)}
          </span>

          <button
            type="button"
            disabled={deletingId === doc.id}
            onClick={() => handleDelete(doc)}
            className="shrink-0 rounded p-1 text-scantron-bubble/30 transition-colors hover:bg-scantron-red/10 hover:text-scantron-red disabled:opacity-30"
            title="Delete document"
          >
            {deletingId === doc.id ? (
              <div className="size-4 animate-pulse rounded-full border border-scantron-line bg-scantron-line/30" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
