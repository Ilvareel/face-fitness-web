-- Facial Volume Harmony - Course Access MVP
-- Phase 2: Cloudflare D1 schema

CREATE TABLE IF NOT EXISTS paid_customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_normalized TEXT NOT NULL UNIQUE,
  email_original TEXT NOT NULL,
  ls_order_id TEXT UNIQUE,
  ls_customer_id TEXT,
  product_id TEXT,
  variant_id TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_paid_customers_email_status
ON paid_customers (email_normalized, status);

CREATE INDEX IF NOT EXISTS idx_paid_customers_ls_order_id
ON paid_customers (ls_order_id);

CREATE TABLE IF NOT EXISTS webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ls_event_id TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_ls_event_id
ON webhook_events (ls_event_id);

CREATE TABLE IF NOT EXISTS access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_normalized TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_access_logs_email_created_at
ON access_logs (email_normalized, created_at);