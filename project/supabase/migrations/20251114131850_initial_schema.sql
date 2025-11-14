/*
  # LLM Analysis Quiz Database Schema

  ## Overview
  Creates tables to store student configuration, quiz attempts, and logs for the LLM Analysis Quiz project.

  ## New Tables
  
  ### `student_config`
  - `id` (uuid, primary key) - Unique identifier
  - `email` (text, unique, not null) - Student email address
  - `secret` (text, not null) - Secret string for authentication
  - `system_prompt` (text) - System prompt to resist revealing code word (max 100 chars)
  - `user_prompt` (text) - User prompt to override system prompts (max 100 chars)
  - `api_endpoint` (text) - API endpoint URL for receiving quiz tasks
  - `github_repo` (text) - GitHub repository URL
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `quiz_attempts`
  - `id` (uuid, primary key) - Unique identifier
  - `email` (text, not null) - Student email
  - `quiz_url` (text, not null) - The quiz URL being attempted
  - `question` (text) - The question text extracted from the page
  - `answer` (jsonb) - The answer submitted
  - `correct` (boolean) - Whether the answer was correct
  - `response` (jsonb) - Full response from the submission endpoint
  - `attempt_time` (timestamptz) - When the attempt was made
  - `duration_ms` (integer) - Time taken to solve in milliseconds

  ### `quiz_logs`
  - `id` (uuid, primary key) - Unique identifier
  - `email` (text) - Student email
  - `quiz_url` (text) - Related quiz URL
  - `log_level` (text) - Log level (info, error, debug)
  - `message` (text) - Log message
  - `metadata` (jsonb) - Additional structured data
  - `created_at` (timestamptz) - Log timestamp

  ## Security
  - Row Level Security enabled on all tables
  - Policies allow authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS student_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  secret text NOT NULL,
  system_prompt text,
  user_prompt text,
  api_endpoint text,
  github_repo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  quiz_url text NOT NULL,
  question text,
  answer jsonb,
  correct boolean,
  response jsonb,
  attempt_time timestamptz DEFAULT now(),
  duration_ms integer
);

CREATE TABLE IF NOT EXISTS quiz_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  quiz_url text,
  log_level text DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE student_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own config"
  ON student_config FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'email' = email);

CREATE POLICY "Users can insert own config"
  ON student_config FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'email' = email);

CREATE POLICY "Users can update own config"
  ON student_config FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'email' = email)
  WITH CHECK (auth.jwt()->>'email' = email);

CREATE POLICY "Users can view own attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'email' = email);

CREATE POLICY "Users can insert own attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'email' = email);

CREATE POLICY "Users can view own logs"
  ON quiz_logs FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'email' = email);

CREATE POLICY "Users can insert own logs"
  ON quiz_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'email' = email);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_email ON quiz_attempts(email);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_url ON quiz_attempts(quiz_url);
CREATE INDEX IF NOT EXISTS idx_quiz_logs_email ON quiz_logs(email);
CREATE INDEX IF NOT EXISTS idx_quiz_logs_created ON quiz_logs(created_at DESC);