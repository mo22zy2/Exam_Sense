-- Migration: 00003_pipeline.sql
-- Creates jobs, job_documents, job_outputs tables with RLS

-- 1. jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  current_step TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id_status ON jobs (user_id, status);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own jobs" ON jobs;
CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own jobs" ON jobs;
CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. job_documents (join table)
CREATE TABLE IF NOT EXISTS job_documents (
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  PRIMARY KEY (job_id, document_id)
);

ALTER TABLE job_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own job_documents" ON job_documents;
CREATE POLICY "Users can view own job_documents"
  ON job_documents FOR SELECT
  USING (job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own job_documents" ON job_documents;
CREATE POLICY "Users can insert own job_documents"
  ON job_documents FOR INSERT
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid()));

-- 3. job_outputs table
CREATE TABLE IF NOT EXISTS job_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  output_type TEXT NOT NULL CHECK (output_type IN ('extract', 'knowledge_base', 'professor_dna', 'exam_targets', 'predicted_exam')),
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, output_type)
);

ALTER TABLE job_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own job_outputs" ON job_outputs;
CREATE POLICY "Users can view own job_outputs"
  ON job_outputs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own job_outputs" ON job_outputs;
CREATE POLICY "Users can insert own job_outputs"
  ON job_outputs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
