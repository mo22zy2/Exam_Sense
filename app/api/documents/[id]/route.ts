import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (document.status === "queued" || document.status === "processed") {
      return NextResponse.json(
        { error: "Cannot delete a document that is currently being processed" },
        { status: 409 },
      );
    }

    await supabase.storage.from("documents").remove([document.storage_path]);

    await supabase.from("documents").delete().eq("id", id);

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
