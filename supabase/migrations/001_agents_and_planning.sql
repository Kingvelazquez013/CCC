-- CCC v2: Agents + Planning tables
-- Run this migration in your Supabase SQL editor

-- ── Agents table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar_emoji TEXT DEFAULT '🤖',
  status TEXT DEFAULT 'standby'
    CHECK (status IN ('standby', 'working', 'offline')),
  model TEXT NOT NULL,
  fallback_model TEXT,
  departments TEXT[] DEFAULT '{}',
  businesses TEXT[] DEFAULT '{}',
  priority_floor TEXT DEFAULT 'low',
  system_prompt TEXT DEFAULT '',
  executor TEXT DEFAULT 'claude-cli'
    CHECK (executor IN ('claude-cli', 'openclaw', 'http')),
  executor_config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Agent executions (observability) ─────────────────────────────
CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  model_used TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'timeout')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Planning messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_planning_messages (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Add "planning" to stages (if using enum) ─────────────────────
-- If your tasks.stage is a text column, no change needed.
-- If it's an enum, uncomment:
-- ALTER TYPE stage ADD VALUE IF NOT EXISTS 'planning' BEFORE 'assigned';

-- ── Seed default agents ──────────────────────────────────────────
INSERT INTO agents (name, role, model, fallback_model, departments, system_prompt, avatar_emoji)
VALUES
  ('eng-agent', 'builder', 'claude-sonnet-4-6', 'claude-opus-4-6',
   '{engineering,dev,backend,frontend,devops,infra,data,platform}',
   'You are an engineering agent. You write code, fix bugs, build features, and deploy infrastructure. You are thorough, test your work, and follow best practices.',
   '⚙️'),

  ('content-agent', 'writer', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-6',
   '{marketing,content,social}',
   'You are a content agent. You write compelling copy, blog posts, social media content, and marketing materials. You match the brand voice.',
   '✏️'),

  ('research-agent', 'researcher', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-6',
   '{sales,ops,strategy}',
   'You are a research agent. You gather information, analyze data, create reports, and provide strategic recommendations.',
   '🔍'),

  ('review-agent', 'reviewer', 'claude-sonnet-4-6', 'claude-opus-4-6',
   '{}',
   'You are a review agent. You check work quality, verify completeness, flag issues, and ensure tasks meet acceptance criteria. You handle any department.',
   '✅')
ON CONFLICT (name) DO NOTHING;

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agents_enabled ON agents(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_task ON agent_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_planning_messages_task ON task_planning_messages(task_id);

-- ── Auto-update updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
