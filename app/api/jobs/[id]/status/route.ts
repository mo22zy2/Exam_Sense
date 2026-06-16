import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  "extract",
  "knowledge_base",
  "professor_dna",
  "exam_targets",
  "predicted_exam",
] as const;

export async function GET(
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

    const { data: job, error } = await supabase
      .from("jobs")
      .select("id, user_id, status, current_step, error_message, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      status: job.status,
      current_step: job.current_step,
      steps: STEPS,
      error_message: job.error_message,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch job status" }, { status: 500 });
  }
}
