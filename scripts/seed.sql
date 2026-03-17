-- CCC Seed Data
-- Run after migrations to populate demo data.
-- Usage: psql $DATABASE_URL -f scripts/seed.sql
--   or paste into Supabase SQL editor

-- ── Sample tasks ────────────────────────────────────────────────
INSERT INTO tasks (title, description, business, department, stage, priority) VALUES
  ('Set up CI/CD pipeline', 'Configure GitHub Actions for automated testing and deployment', 'acme', 'engineering', 'backlog', 'high'),
  ('Write Q1 blog post', 'Draft a blog post about our Q1 product updates', 'acme', 'marketing', 'backlog', 'medium'),
  ('Research competitor pricing', 'Analyze competitor pricing models and create comparison chart', 'acme', 'sales', 'backlog', 'medium'),
  ('Fix login timeout bug', 'Users report being logged out after 5 minutes', 'acme', 'engineering', 'backlog', 'urgent'),
  ('Update landing page copy', 'Refresh hero section and feature descriptions', 'acme', 'content', 'backlog', 'low')
ON CONFLICT DO NOTHING;

-- ── Agents (if not already seeded by migration) ────────────────
INSERT INTO agents (name, role, model, fallback_model, departments, system_prompt, avatar_emoji)
VALUES
  ('eng-agent', 'builder', 'claude-sonnet-4-6', 'claude-opus-4-6',
   '{engineering,dev,backend,frontend,devops,infra,data,platform}',
   'You are an engineering agent. You write code, fix bugs, build features, and deploy infrastructure.',
   '⚙️'),
  ('content-agent', 'writer', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-6',
   '{marketing,content,social}',
   'You are a content agent. You write compelling copy, blog posts, and marketing materials.',
   '✏️'),
  ('research-agent', 'researcher', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-6',
   '{sales,ops,strategy}',
   'You are a research agent. You gather information, analyze data, and provide recommendations.',
   '🔍'),
  ('review-agent', 'reviewer', 'claude-sonnet-4-6', 'claude-opus-4-6',
   '{}',
   'You are a review agent. You check work quality, verify completeness, and flag issues.',
   '✅')
ON CONFLICT (name) DO NOTHING;
