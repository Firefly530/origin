-- Logical schema for self-growth game (local-first, cloud-expandable)
-- This is an architecture-level SQL draft, not a migration script.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  exam_goal_date TEXT,
  daily_budget_cents INTEGER NOT NULL DEFAULT 25000,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE task_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1,
  is_mandatory_candidate INTEGER NOT NULL DEFAULT 1,
  expected_minutes INTEGER NOT NULL DEFAULT 30,
  defect_tags_json TEXT NOT NULL DEFAULT '[]',
  profession_role_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (goal_id) REFERENCES goals(id)
);

CREATE TABLE daily_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  task_date TEXT NOT NULL,
  source_type TEXT NOT NULL, -- mandatory / optional / recovery
  status TEXT NOT NULL, -- pending / completed / missed
  reward_coin INTEGER NOT NULL DEFAULT 0,
  penalty_coin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (template_id) REFERENCES task_templates(id)
);

CREATE UNIQUE INDEX idx_daily_tasks_unique
ON daily_tasks(user_id, template_id, task_date, source_type);

CREATE TABLE completion_logs (
  id TEXT PRIMARY KEY,
  daily_task_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  quality_score REAL NOT NULL DEFAULT 1.0,
  reflection_text TEXT,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (daily_task_id) REFERENCES daily_tasks(id)
);

CREATE TABLE profession_roles (
  code TEXT PRIMARY KEY, -- doctor / engineer / coach / researcher
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_multiplier_json TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE weekly_profession_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_key TEXT NOT NULL, -- e.g. 2026-W18
  role_code TEXT NOT NULL,
  changed_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_code) REFERENCES profession_roles(code)
);

CREATE UNIQUE INDEX idx_weekly_profession_unique
ON weekly_profession_plans(user_id, week_key, is_active);

CREATE TABLE wallets (
  user_id TEXT PRIMARY KEY,
  coin_balance INTEGER NOT NULL DEFAULT 0,
  energy INTEGER NOT NULL DEFAULT 100,
  reputation INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE reward_catalog (
  id TEXT PRIMARY KEY,
  reward_type TEXT NOT NULL, -- virtual_item / real_world_reward
  tier TEXT NOT NULL, -- S / A / B / C / X
  title TEXT NOT NULL,
  coin_cost INTEGER NOT NULL,
  budget_cost_cents INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 1,
  weekly_limit INTEGER NOT NULL DEFAULT 7,
  cooldown_minutes INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE redemption_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  redeemed_at TEXT NOT NULL,
  coin_spent INTEGER NOT NULL,
  budget_spent_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reward_id) REFERENCES reward_catalog(id)
);

CREATE INDEX idx_redemption_user_day
ON redemption_records(user_id, redeemed_at);

CREATE TABLE consequence_rules (
  id TEXT PRIMARY KEY,
  trigger_type TEXT NOT NULL, -- missed_daily / low_weekly_completion
  trigger_condition_json TEXT NOT NULL,
  effect_json TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE consequence_states (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  state_status TEXT NOT NULL, -- active / recovering / resolved
  started_at TEXT NOT NULL,
  expires_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (rule_id) REFERENCES consequence_rules(id)
);

CREATE TABLE recovery_plans (
  id TEXT PRIMARY KEY,
  consequence_state_id TEXT NOT NULL,
  required_days INTEGER NOT NULL DEFAULT 3,
  progress_days INTEGER NOT NULL DEFAULT 0,
  required_tasks_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (consequence_state_id) REFERENCES consequence_states(id)
);

CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_code) REFERENCES profession_roles(code)
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_role TEXT NOT NULL, -- user / assistant / system
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

CREATE INDEX idx_chat_messages_session
ON chat_messages(session_id, created_at);

CREATE TABLE prompt_templates (
  id TEXT PRIMARY KEY,
  role_code TEXT NOT NULL,
  version TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'file', -- file / db_override
  content TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (role_code) REFERENCES profession_roles(code)
);

CREATE TABLE sync_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  operation_type TEXT NOT NULL, -- insert / update / delete
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  synced_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- career_nodes: per profession_role_code, 18 rows (3 stages x 6 titles), level_order 1..18, title text, unlock_rule_json (documentary).
CREATE TABLE career_nodes (
  id TEXT PRIMARY KEY,
  profession_role_code TEXT NOT NULL,
  level_order INTEGER NOT NULL,
  career_stage INTEGER NOT NULL DEFAULT 1,
  tier_in_stage INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  unlock_rule_json TEXT NOT NULL DEFAULT '{}',
  reward_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (profession_role_code) REFERENCES profession_roles(code)
);

-- user_profession_careers: runtime monthly promotion state per (user, profession).
CREATE TABLE user_profession_careers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  profession_role_code TEXT NOT NULL,
  career_stage INTEGER NOT NULL DEFAULT 1,
  tier_in_stage INTEGER NOT NULL DEFAULT 1,
  tracking_month_key TEXT NOT NULL DEFAULT '',
  month_promotion_points INTEGER NOT NULL DEFAULT 0,
  last_evaluated_month_key TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (profession_role_code) REFERENCES profession_roles(code)
);

CREATE UNIQUE INDEX idx_user_profession_career_unique
ON user_profession_careers(user_id, profession_role_code);

-- Key architecture constraints (application-enforced + DB-guarded where possible):
-- 1) Daily budget guardrail:
--    sum(redemption_records.budget_spent_cents for user/day) <= users.daily_budget_cents
-- 2) Consequence trigger on missed mandatory tasks:
--    when daily_tasks.status='missed' and source_type='mandatory', evaluate consequence_rules
-- 3) Only one active weekly profession per user/week:
--    idx_weekly_profession_unique guarantees uniqueness on (user_id, week_key, is_active)
