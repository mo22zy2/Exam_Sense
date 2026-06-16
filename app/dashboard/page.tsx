"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { LogOut, FileText, AlertCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { DocumentUploader } from "@/components/DocumentUploader";
import { DocumentList } from "@/components/DocumentList";
import { SectionMarker } from "@/components/core";

type Document = {
  id: string;
  file_name: string;
  document_type: "lecture" | "exam";
  status: string;
  file_size_bytes: number;
  created_at: string;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, [supabase]);

  const fetchDocuments = useCallback(async () => {
    setDocsLoading(true);
    setDocsError(null);
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) {
        setDocsError("Failed to load documents.");
        return;
      }
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch {
      setDocsError("Failed to load documents.");
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="size-4 animate-pulse rounded-full border border-scantron-line bg-scantron-line/20" />
          <p className="text-sm text-scantron-bubble/40">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-scantron-paper">
      <header className="flex items-center justify-between border-b border-scantron-line px-6 py-4">
        <h1 className="font-mono text-xs font-bold tracking-widest text-scantron-bubble">
          EXAMENSE
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-scantron-bubble/60">
            {user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg border border-scantron-line px-4 py-2 text-sm font-medium text-scantron-bubble transition-colors hover:bg-scantron-bubble/5"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <SectionMarker label="YOUR DOCUMENTS" sublabel={documents.length > 0 ? `${documents.length} document${documents.length !== 1 ? "s" : ""}` : undefined} />

        {docsError ? (
          <div className="flex items-center gap-2 rounded-lg border border-scantron-red/20 bg-scantron-red/5 px-4 py-3 text-sm text-scantron-red">
            <AlertCircle className="size-4 shrink-0" />
            {docsError}
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
            <DocumentUploader />
            <DocumentList documents={documents} loading={docsLoading} />
          </div>
        )}
      </main>
    </div>
  );
}
