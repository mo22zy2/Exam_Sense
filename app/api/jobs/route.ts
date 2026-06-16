import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Count eligible lecture and exam documents
    const { data: lectures, error: lectErr } = await supabase
      .from("documents")
      .select("id")
      .eq("user_id", userId)
      .eq("document_type", "lecture")
      .eq("status", "uploaded");

    if (lectErr) {
      return NextResponse.json({ error: "Failed to check documents" }, { status: 500 });
    }

    const { data: exams, error: examErr } = await supabase
      .from("documents")
      .select("id")
      .eq("user_id", userId)
      .eq("document_type", "exam")
      .eq("status", "uploaded");

    if (examErr) {
      return NextResponse.json({ error: "Failed to check documents" }, { status: 500 });
    }

    if (!lectures || lectures.length === 0) {
      return NextResponse.json(
        { error: "You need at least one lecture document to start a job" },
        { status: 400 },
      );
    }

    if (!exams || exams.length === 0) {
      return NextResponse.json(
        { error: "You need at least one exam document to start a job" },
        { status: 400 },
      );
    }

    // Check no active job
    const { data: activeJob } = await supabase
      .from("jobs")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["queued", "running"])
      .maybeSingle();

    if (activeJob) {
      return NextResponse.json(
        { error: "A job is already active. Wait for it to complete before starting another." },
        { status: 409 },
      );
    }

    // Create the job
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .insert({
        user_id: userId,
        status: "queued",
      })
      .select("id, status")
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    // Link documents to job
    const allDocIds = [
      ...lectures.map((d) => d.id),
      ...exams.map((d) => d.id),
    ];

    const { error: linkErr } = await supabase.from("job_documents").insert(
      allDocIds.map((documentId) => ({
        job_id: job.id,
        document_id: documentId,
      })),
    );

    if (linkErr) {
      // Cleanup: delete the job
      await supabase.from("jobs").delete().eq("id", job.id);
      return NextResponse.json({ error: "Failed to link documents to job" }, { status: 500 });
    }

    return NextResponse.json(job, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("id, status, current_step, error_message, created_at, updated_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }

    return NextResponse.json({ jobs });
  } catch {
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
