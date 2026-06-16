import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/lib/planRules";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("document_type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!documentType || !["lecture", "exam"].includes(documentType)) {
      return NextResponse.json(
        { error: "document_type must be 'lecture' or 'exam'" },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const header = new TextDecoder().decode(buffer.slice(0, 4));
    if (!header.startsWith("%PDF")) {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", session.user.id)
      .single();

    const plan = (profile?.plan as "free" | "premium") ?? "free";
    const { maxFileSizeBytes, maxDocuments } = getPlanLimits(plan);

    if (file.size > maxFileSizeBytes) {
      return NextResponse.json(
        { error: "File exceeds your plan's size limit" },
        { status: 400 },
      );
    }

    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .neq("status", "archived");

    if (count !== null && count >= maxDocuments) {
      return NextResponse.json(
        { error: "You have reached the maximum number of documents for your plan" },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const uuid = crypto.randomUUID();
    const storagePath = `${userId}/${uuid}-${file.name}`;

    const uploadResult = await supabase.storage
      .from("documents")
      .upload(storagePath, file);

    if (uploadResult.error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: doc, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        file_name: file.name,
        storage_path: storagePath,
        document_type: documentType,
        file_size_bytes: file.size,
        status: "uploaded",
      })
      .select("id, file_name, document_type, file_size_bytes, created_at")
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    return NextResponse.json(doc, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
