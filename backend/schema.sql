-- EdgeLink D1 Database Schema
-- Based on PRD Section 9.3: Data Models
-- Version: 1.0

-- Users table: User accounts and authentication
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro')),
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Links table: URL mappings and metadata
CREATE TABLE IF NOT EXISTS links (
  slug TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  destination TEXT NOT NULL,
  custom_domain TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  max_clicks INTEGER,
  click_count INTEGER DEFAULT 0,
  password_hash TEXT,
  utm_template TEXT,
  device_routing TEXT, -- JSON: {"mobile": "url", "desktop": "url", "tablet": "url"}
  geo_routing TEXT, -- JSON: {"US": "url", "IN": "url", "default": "url"}
  referrer_routing TEXT, -- JSON: {"twitter.com": "url", "linkedin.com": "url", "default": "url"}
  ab_testing TEXT, -- JSON: {"variant_a": "url", "variant_b": "url", "split": 50}
  utm_params TEXT, -- UTM parameters to auto-append
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Refresh tokens table: JWT refresh token storage
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Custom domains table: User domain management
CREATE TABLE IF NOT EXISTS custom_domains (
  domain_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  domain_name TEXT UNIQUE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Usage tracking table: Monitor user limits (links/month, API calls/day)
CREATE TABLE IF NOT EXISTS usage_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK(metric_type IN ('links_created', 'api_calls', 'clicks_tracked')),
  count INTEGER DEFAULT 0,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Anonymous links table: Track links created without authentication
CREATE TABLE IF NOT EXISTS anonymous_links (
  slug TEXT PRIMARY KEY,
  destination TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL, -- Auto-expire in 30 days
  click_count INTEGER DEFAULT 0
);

-- Webhooks table: User-configured webhook endpoints
CREATE TABLE IF NOT EXISTS webhooks (
  webhook_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array of event types
  secret TEXT NOT NULL, -- HMAC secret for signature verification
  slug TEXT, -- Specific link slug (NULL = all links)
  active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- API Keys table: Long-lived API authentication tokens (Week 3)
CREATE TABLE IF NOT EXISTS api_keys (
  key_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 11 chars for display (elk_xxxxxxx)
  key_hash TEXT NOT NULL, -- Hashed full key
  name TEXT NOT NULL, -- User-defined key name
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_links ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_domains ON custom_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id, metric_type, period_start);
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);
CREATE INDEX IF NOT EXISTS idx_anonymous_links_expires_at ON anonymous_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- Triggers for updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
END;

CREATE TRIGGER IF NOT EXISTS update_links_timestamp
AFTER UPDATE ON links
BEGIN
  UPDATE links SET updated_at = CURRENT_TIMESTAMP WHERE slug = NEW.slug;
END;
