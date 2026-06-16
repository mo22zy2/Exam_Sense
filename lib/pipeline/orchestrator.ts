/**
 * Pipeline orchestrator - executes one step at a time.
 * Called by the run-step API route. All storage paths live under
 * `outputs` bucket: {userId}/{jobId}/extracts/{docId}.md and
 * {userId}/{jobId}/outputs/{step}.md.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { callLLM } from "@/lib/openrouter";
import { extractText } from "@/lib/pipeline/extractPdf";
import {
  EXTRACT_PROMPT,
  KNOWLEDGE_BASE_PROMPT,
  PROFESSOR_DNA_PROMPT,
  EXAM_TARGETS_PROMPT,
  PREDICTED_EXAM_PROMPT,
} from "@/lib/pipeline/prompts";

/**
 * Execute one pipeline step for a given job.
 * Throws on unrecoverable error - caller (run-step route) handles retries.
 */
export async function executeStep(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  step: string,
): Promise<void> {
  switch (step) {
    case "extract":
      return doExtract(supabase, userId, jobId);
    case "knowledge_base":
      return doDocTypeStep(supabase, userId, jobId, "knowledge_base", KNOWLEDGE_BASE_PROMPT, "lecture");
    case "professor_dna":
      return doDocTypeStep(supabase, userId, jobId, "professor_dna", PROFESSOR_DNA_PROMPT, "exam");
    case "exam_targets":
      return doCombinedStep(supabase, userId, jobId, "exam_targets", EXAM_TARGETS_PROMPT, [
        "knowledge_base",
        "professor_dna",
      ]);
    case "predicted_exam":
      return doCombinedStep(supabase, userId, jobId, "predicted_exam", PREDICTED_EXAM_PROMPT, [
        "knowledge_base",
        "professor_dna",
        "exam_targets",
      ]);
    default:
      throw new Error("Unknown step: " + step);
  }
}

// ---- Step 1: Extract -----------------------------------------

async function doExtract(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
): Promise<void> {
  // Get all documents linked to this job
  const { data: links, error: linkErr } = await supabase
    .from("job_documents")
    .select("document_id")
    .eq("job_id", jobId);
  if (linkErr) throw new Error("Failed to read job documents");

  const docIds = links.map((l: { document_id: string }) => l.document_id);
  if (docIds.length === 0) throw new Error("Job has no linked documents");

  const { data: docs, error: docErr } = await supabase
    .from("documents")
    .select("id, file_name, document_type, storage_path")
    .in("id", docIds);
  if (docErr) throw new Error("Failed to read documents");

  const extracts: { text: string; docType: string; fileName: string }[] = [];
  let anySucceeded = false;

  for (const doc of docs) {
    try {
      // Download PDF from documents bucket
      const { data: pdfBuf, error: dlErr } = await supabase.storage
        .from("documents")
        .download(doc.storage_path);
      if (dlErr || !pdfBuf) throw new Error("PDF download failed");

      const result = await extractText(await pdfBuf.arrayBuffer());

      if (result.isEmpty) {
        await supabase
          .from("documents")
          .update({ status: "extraction_failed" })
          .eq("id", doc.id);
        continue;
      }

      // Mark as processed
      await supabase
        .from("documents")
        .update({ status: "processed" })
        .eq("id", doc.id);

      anySucceeded = true;

      // Store per-document extract
      const extractPath = userId + "/" + jobId + "/extracts/" + doc.id + ".md";
      await supabase.storage.from("outputs").upload(extractPath, result.text, {
        contentType: "text/markdown",
        upsert: true,
      });

      extracts.push({
        text: result.text,
        docType: doc.document_type,
        fileName: doc.file_name,
      });
    } catch {
      // Individual doc failure - mark extraction_failed, continue with rest
      await supabase
        .from("documents")
        .update({ status: "extraction_failed" })
        .eq("id", doc.id);
    }
  }

  if (!anySucceeded) {
    throw new Error("All documents failed text extraction");
  }

  // Build combined extract output
  const combined = extracts
    .map(
      (e) =>
        "# " + e.fileName + "\n**Type:** " + e.docType + "\n\n" + e.text + "\n\n---\n",
    )
    .join("\n");

  await storeOutput(supabase, userId, jobId, "extract", combined);
}

// ---- Steps that use a single doc type (KB, DNA) ---------------

async function doDocTypeStep(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  step: string,
  systemPrompt: string,
  docType: string,
): Promise<void> {
  const texts = await loadDocExtracts(supabase, userId, jobId, docType);
  if (texts.length === 0) {
    throw new Error("No " + docType + " documents available for " + step + " step");
  }

  const input = texts.join("\n\n---\n\n");
  const result = await callLLM(systemPrompt, input);
  await storeOutput(supabase, userId, jobId, step, result);
}

// ---- Steps that combine prior step outputs (exam_targets, predicted_exam) --

async function doCombinedStep(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  step: string,
  systemPrompt: string,
  priorSteps: string[],
): Promise<void> {
  const parts: string[] = [];

  for (const priorStep of priorSteps) {
    const content = await loadOutput(supabase, jobId, priorStep);
    parts.push("## " + priorStep + "\n\n" + content);
  }

  const input = parts.join("\n\n---\n\n");
  const result = await callLLM(systemPrompt, input);
  await storeOutput(supabase, userId, jobId, step, result);
}

// ---- Storage helpers -------------------------------------------

/**
 * Upload output markdown to Storage and upsert job_outputs row.
 */
async function storeOutput(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  step: string,
  content: string,
): Promise<void> {
  const storagePath = userId + "/" + jobId + "/outputs/" + step + ".md";

  const { error: uploadErr } = await supabase.storage
    .from("outputs")
    .upload(storagePath, content, {
      contentType: "text/markdown",
      upsert: true,
    });
  if (uploadErr) throw new Error("Failed to upload " + step + ": " + uploadErr.message);

  const { error: upsertErr } = await supabase.from("job_outputs").upsert(
    {
      job_id: jobId,
      user_id: userId,
      output_type: step,
      storage_path: storagePath,
      status: "completed",
    },
    { onConflict: "job_id,output_type" },
  );
  if (upsertErr)
    throw new Error("Failed to record " + step + ": " + upsertErr.message);
}

/**
 * Read a prior step's output from Storage.
 */
async function loadOutput(
  supabase: SupabaseClient,
  jobId: string,
  step: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("job_outputs")
    .select("storage_path")
    .eq("job_id", jobId)
    .eq("output_type", step)
    .eq("status", "completed")
    .single();

  if (error || !data?.storage_path) {
    throw new Error("Output not ready: " + step);
  }

  const { data: file, error: dlErr } = await supabase.storage
    .from("outputs")
    .download(data.storage_path);

  if (dlErr || !file) throw new Error("Failed to read " + step + " output");

  return await file.text();
}

/**
 * Load extracted text for all documents of a given type.
 * Reads per-doc extract files from Storage.
 */
async function loadDocExtracts(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  docType: string,
): Promise<string[]> {
  // Get doc IDs for this job
  const { data: links } = await supabase
    .from("job_documents")
    .select("document_id")
    .eq("job_id", jobId);

  const docIds = (links ?? []).map((l: { document_id: string }) => l.document_id);
  if (docIds.length === 0) return [];

  // Get docs of the requested type that were successfully processed
  const { data: docs } = await supabase
    .from("documents")
    .select("id, file_name")
    .in("id", docIds)
    .eq("document_type", docType)
    .eq("status", "processed");

  const texts: string[] = [];

  for (const doc of docs ?? []) {
    const extractPath = userId + "/" + jobId + "/extracts/" + doc.id + ".md";

    const { data: file, error: dlErr } = await supabase.storage
      .from("outputs")
      .download(extractPath);

    if (dlErr || !file) continue; // Skip missing extracts

    const text = await file.text();
    texts.push("## " + doc.file_name + "\n\n" + text);
  }

  return texts;
}
