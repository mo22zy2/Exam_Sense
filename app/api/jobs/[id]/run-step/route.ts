import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { executeStep } from "@/lib/pipeline/orchestrator";
import { STEP_ORDER } from "@/lib/pipeline/context";
import { OpenRouterError } from "@/lib/openrouter";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // -- Auth check ------------------------------------------------
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // -- Load job & verify ownership -------------------------------
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, user_id, status")
      .eq("id", id)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json(
        { error: "Job is already " + job.status },
        { status: 409 },
      );
    }

    // -- Load existing outputs to find next step -------------------
    const { data: outputs } = await supabase
      .from("job_outputs")
      .select("output_type, status")
      .eq("job_id", id);

    const nextStep = getNextStep(outputs ?? []);
    if (!nextStep) {
      // All steps complete -- mark job completed
      await supabase
        .from("jobs")
        .update({
          status: "completed",
          current_step: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      return NextResponse.json({
        status: "completed",
        current_step: null,
        steps: STEP_ORDER,
        error_message: null,
      });
    }

    // Guard: prevent concurrent step execution
    const existingOutput = outputs?.find((o) => o.output_type === nextStep);
    if (existingOutput?.status === "running") {
      return NextResponse.json(
        { error: "Step " + nextStep + " is already running" },
        { status: 409 },
      );
    }

    // -- Use service client for DB writes --------------------------
    const serviceSupabase = await createServiceClient();

    // Mark step as running in DB
    await serviceSupabase.from("job_outputs").upsert(
      {
        job_id: id,
        user_id: userId,
        output_type: nextStep,
        status: "running",
      },
      { onConflict: "job_id,output_type" },
    );

    await serviceSupabase
      .from("jobs")
      .update({
        status: "running",
        current_step: nextStep,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // -- Execute with retry-once -----------------------------------
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await executeStep(serviceSupabase, userId, id, nextStep);
        lastError = null;
        break;
      } catch (err) {
        lastError =
          err instanceof Error ? err : new Error(String(err));

        // Retry only on rate-limit or server errors
        if (err instanceof OpenRouterError && err.retryable && attempt < 2) {
          continue;
        }
        break;
      }
    }

    // -- Handle failure --------------------------------------------
    if (lastError) {
      const errorMsg = "Step \"" + nextStep + "\" failed: " + lastError.message;

      await serviceSupabase
        .from("job_outputs")
        .update({ status: "failed" })
        .eq("job_id", id)
        .eq("output_type", nextStep);

      await serviceSupabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: errorMsg,
          current_step: nextStep,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      return NextResponse.json({
        status: "failed",
        current_step: nextStep,
        steps: STEP_ORDER,
        error_message: errorMsg,
      });
    }

    // -- Success ---------------------------------------------------
    return NextResponse.json({
      status: "running",
      current_step: nextStep,
      steps: STEP_ORDER,
      error_message: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to run step";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Determine the next pipeline step to execute.
 * Returns null if all steps are completed.
 */
function getNextStep(
  outputs: { output_type: string; status: string }[],
): string | null {
  for (const step of STEP_ORDER) {
    const output = outputs.find((o) => o.output_type === step);
    if (!output || output.status === "pending" || output.status === "failed") {
      return step;
    }
  }
  return null;
}
