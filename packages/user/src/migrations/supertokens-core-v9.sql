CREATE INDEX IF NOT EXISTS app_id_to_user_id_primary_user_id_index
  ON app_id_to_user_id (primary_or_recipe_user_id, app_id);

ALTER TABLE user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_fkey;

ALTER TABLE totp_user_devices
  ADD COLUMN IF NOT EXISTS created_at BIGINT DEFAULT 0;

ALTER TABLE totp_user_devices
  ALTER COLUMN created_at DROP DEFAULT;

ALTER TABLE tenant_configs
  ADD COLUMN IF NOT EXISTS is_first_factors_null BOOLEAN DEFAULT TRUE;

ALTER TABLE tenant_configs
  ALTER COLUMN is_first_factors_null DROP DEFAULT;

CREATE INDEX IF NOT EXISTS user_last_active_last_active_time_index
  ON user_last_active (last_active_time DESC, app_id DESC);

CREATE TABLE IF NOT EXISTS oauth_clients (
  app_id VARCHAR(64),
  client_id VARCHAR(255) NOT NULL,
  is_client_credentials_only BOOLEAN NOT NULL,
  PRIMARY KEY (app_id, client_id),
  FOREIGN KEY(app_id) REFERENCES apps(app_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS oauth_sessions (
  gid VARCHAR(255),
  app_id VARCHAR(64) DEFAULT 'public',
  client_id VARCHAR(255) NOT NULL,
  session_handle VARCHAR(128),
  external_refresh_token VARCHAR(255) UNIQUE,
  internal_refresh_token VARCHAR(255) UNIQUE,
  jti TEXT NOT NULL,
  exp BIGINT NOT NULL,
  PRIMARY KEY (gid),
  FOREIGN KEY(app_id, client_id) REFERENCES oauth_clients(app_id, client_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS oauth_session_exp_index ON oauth_sessions(exp DESC);
CREATE INDEX IF NOT EXISTS oauth_session_external_refresh_token_index
  ON oauth_sessions(app_id, external_refresh_token DESC);

CREATE TABLE IF NOT EXISTS oauth_m2m_tokens (
  app_id VARCHAR(64) DEFAULT 'public',
  client_id VARCHAR(255) NOT NULL,
  iat BIGINT NOT NULL,
  exp BIGINT NOT NULL,
  PRIMARY KEY (app_id, client_id, iat),
  FOREIGN KEY(app_id, client_id) REFERENCES oauth_clients(app_id, client_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS oauth_m2m_token_iat_index ON oauth_m2m_tokens(iat DESC, app_id DESC);
CREATE INDEX IF NOT EXISTS oauth_m2m_token_exp_index ON oauth_m2m_tokens(exp DESC);

CREATE TABLE IF NOT EXISTS oauth_logout_challenges (
  app_id VARCHAR(64) DEFAULT 'public',
  challenge VARCHAR(128) NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  post_logout_redirect_uri VARCHAR(1024),
  session_handle VARCHAR(128),
  state VARCHAR(128),
  time_created BIGINT NOT NULL,
  PRIMARY KEY (app_id, challenge),
  FOREIGN KEY(app_id, client_id) REFERENCES oauth_clients(app_id, client_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS oauth_logout_challenges_time_created_index
  ON oauth_logout_challenges(time_created DESC);

CREATE TABLE IF NOT EXISTS bulk_import_users (
  id CHAR(36),
  app_id VARCHAR(64) NOT NULL DEFAULT 'public',
  primary_user_id VARCHAR(36),
  raw_data TEXT NOT NULL,
  status VARCHAR(128) DEFAULT 'NEW',
  error_msg TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT bulk_import_users_pkey PRIMARY KEY(app_id, id),
  CONSTRAINT bulk_import_users__app_id_fkey FOREIGN KEY(app_id) REFERENCES apps(app_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS bulk_import_users_status_updated_at_index
  ON bulk_import_users (app_id, status, updated_at);

CREATE INDEX IF NOT EXISTS bulk_import_users_pagination_index1
  ON bulk_import_users (app_id, status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS bulk_import_users_pagination_index2
  ON bulk_import_users (app_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS session_info_user_id_app_id_index ON session_info (user_id, app_id);

CREATE INDEX IF NOT EXISTS emailpassword_users_email_index ON emailpassword_users (app_id, email);
CREATE INDEX IF NOT EXISTS emailpassword_user_to_tenant_email_index
  ON emailpassword_user_to_tenant (app_id, tenant_id, email);

CREATE INDEX IF NOT EXISTS passwordless_users_email_index ON passwordless_users (app_id, email);
CREATE INDEX IF NOT EXISTS passwordless_users_phone_number_index ON passwordless_users (app_id, phone_number);
CREATE INDEX IF NOT EXISTS passwordless_user_to_tenant_email_index
  ON passwordless_user_to_tenant (app_id, tenant_id, email);
CREATE INDEX IF NOT EXISTS passwordless_user_to_tenant_phone_number_index
  ON passwordless_user_to_tenant (app_id, tenant_id, phone_number);

CREATE INDEX IF NOT EXISTS thirdparty_user_to_tenant_third_party_user_id_index
  ON thirdparty_user_to_tenant (app_id, tenant_id, third_party_id, third_party_user_id);

CREATE INDEX IF NOT EXISTS emailverification_verified_emails_app_id_email_index
  ON emailverification_verified_emails (app_id, email);

CREATE TABLE IF NOT EXISTS webauthn_account_recovery_tokens (
  app_id VARCHAR(64) DEFAULT 'public' NOT NULL,
  tenant_id VARCHAR(64) DEFAULT 'public' NOT NULL,
  user_id CHAR(36) NOT NULL,
  email VARCHAR(256) NOT NULL,
  token VARCHAR(256) NOT NULL,
  expires_at BIGINT NOT NULL,
  CONSTRAINT webauthn_account_recovery_token_pkey PRIMARY KEY (app_id, tenant_id, user_id, token),
  CONSTRAINT webauthn_account_recovery_token_user_id_fkey FOREIGN KEY (app_id, tenant_id, user_id)
    REFERENCES all_auth_recipe_users(app_id, tenant_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id VARCHAR(256) NOT NULL,
  app_id VARCHAR(64) DEFAULT 'public' NOT NULL,
  rp_id VARCHAR(256) NOT NULL,
  user_id CHAR(36),
  counter BIGINT NOT NULL,
  public_key BYTEA NOT NULL,
  transports TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (app_id, rp_id, id),
  CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (app_id, user_id)
    REFERENCES webauthn_users (app_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webauthn_generated_options (
  app_id VARCHAR(64) DEFAULT 'public' NOT NULL,
  tenant_id VARCHAR(64) DEFAULT 'public' NOT NULL,
  id CHAR(36) NOT NULL,
  challenge VARCHAR(256) NOT NULL,
  email VARCHAR(256),
  rp_id VARCHAR(256) NOT NULL,
  rp_name VARCHAR(256) NOT NULL,
  origin VARCHAR(256) NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  user_presence_required BOOLEAN DEFAULT false NOT NULL,
  user_verification VARCHAR(12) DEFAULT 'preferred' NOT NULL,
  CONSTRAINT webauthn_generated_options_pkey PRIMARY KEY (app_id, tenant_id, id),
  CONSTRAINT webauthn_generated_options_tenant_id_fkey FOREIGN KEY (app_id, tenant_id)
    REFERENCES tenants (app_id, tenant_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webauthn_user_to_tenant (
  app_id VARCHAR(64) DEFAULT 'public' NOT NULL,
  tenant_id VARCHAR(64) DEFAULT 'public' NOT NULL,
  user_id CHAR(36) NOT NULL,
  email VARCHAR(256) NOT NULL,
  CONSTRAINT webauthn_user_to_tenant_email_key UNIQUE (app_id, tenant_id, email),
  CONSTRAINT webauthn_user_to_tenant_pkey PRIMARY KEY (app_id, tenant_id, user_id),
  CONSTRAINT webauthn_user_to_tenant_user_id_fkey FOREIGN KEY (app_id, tenant_id, user_id)
    REFERENCES all_auth_recipe_users(app_id, tenant_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webauthn_users (
  app_id VARCHAR(64) DEFAULT 'public' NOT NULL,
  user_id CHAR(36) NOT NULL,
  email VARCHAR(256) NOT NULL,
  rp_id VARCHAR(256) NOT NULL,
  time_joined BIGINT NOT NULL,
  CONSTRAINT webauthn_users_pkey PRIMARY KEY (app_id, user_id),
  CONSTRAINT webauthn_users_user_id_fkey FOREIGN KEY (app_id, user_id)
    REFERENCES app_id_to_user_id(app_id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS webauthn_user_to_tenant_email_index
  ON webauthn_user_to_tenant (app_id, email);
CREATE INDEX IF NOT EXISTS webauthn_user_challenges_expires_at_index
  ON webauthn_generated_options (app_id, tenant_id, expires_at);
CREATE INDEX IF NOT EXISTS webauthn_credentials_user_id_index
  ON webauthn_credentials (user_id);
CREATE INDEX IF NOT EXISTS webauthn_account_recovery_token_token_index
  ON webauthn_account_recovery_tokens (app_id, tenant_id, token);
CREATE INDEX IF NOT EXISTS webauthn_account_recovery_token_expires_at_index
  ON webauthn_account_recovery_tokens (expires_at DESC);
CREATE INDEX IF NOT EXISTS webauthn_account_recovery_token_email_index
  ON webauthn_account_recovery_tokens (app_id, tenant_id, email);

CREATE INDEX IF NOT EXISTS user_roles_app_id_user_id_index ON user_roles (app_id, user_id);

CREATE TABLE IF NOT EXISTS saml_clients (
  app_id VARCHAR(64) NOT NULL DEFAULT 'public',
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'public',
  client_id VARCHAR(256) NOT NULL,
  client_secret TEXT,
  sso_login_url TEXT NOT NULL,
  redirect_uris TEXT NOT NULL,
  default_redirect_uri TEXT NOT NULL,
  idp_entity_id VARCHAR(256) NOT NULL,
  idp_signing_certificate TEXT NOT NULL,
  allow_idp_initiated_login BOOLEAN NOT NULL DEFAULT FALSE,
  enable_request_signing BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT saml_clients_pkey PRIMARY KEY(app_id, tenant_id, client_id),
  CONSTRAINT saml_clients_idp_entity_id_key UNIQUE (app_id, tenant_id, idp_entity_id),
  CONSTRAINT saml_clients_app_id_fkey FOREIGN KEY(app_id) REFERENCES apps (app_id) ON DELETE CASCADE,
  CONSTRAINT saml_clients_tenant_id_fkey FOREIGN KEY(app_id, tenant_id)
    REFERENCES tenants (app_id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS saml_clients_app_id_tenant_id_index ON saml_clients (app_id, tenant_id);

CREATE TABLE IF NOT EXISTS saml_relay_state (
  app_id VARCHAR(64) NOT NULL DEFAULT 'public',
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'public',
  relay_state VARCHAR(256) NOT NULL,
  client_id VARCHAR(256) NOT NULL,
  state TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  CONSTRAINT saml_relay_state_pkey PRIMARY KEY(app_id, tenant_id, relay_state),
  CONSTRAINT saml_relay_state_app_id_fkey FOREIGN KEY(app_id) REFERENCES apps (app_id) ON DELETE CASCADE,
  CONSTRAINT saml_relay_state_tenant_id_fkey FOREIGN KEY(app_id, tenant_id)
    REFERENCES tenants (app_id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS saml_relay_state_app_id_tenant_id_index ON saml_relay_state (app_id, tenant_id);
CREATE INDEX IF NOT EXISTS saml_relay_state_expires_at_index ON saml_relay_state (expires_at);

CREATE TABLE IF NOT EXISTS saml_claims (
  app_id VARCHAR(64) NOT NULL DEFAULT 'public',
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'public',
  client_id VARCHAR(256) NOT NULL,
  code VARCHAR(256) NOT NULL,
  claims TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  CONSTRAINT saml_claims_pkey PRIMARY KEY(app_id, tenant_id, code),
  CONSTRAINT saml_claims_app_id_fkey FOREIGN KEY(app_id) REFERENCES apps (app_id) ON DELETE CASCADE,
  CONSTRAINT saml_claims_tenant_id_fkey FOREIGN KEY(app_id, tenant_id)
    REFERENCES tenants (app_id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS saml_claims_app_id_tenant_id_index ON saml_claims (app_id, tenant_id);
CREATE INDEX IF NOT EXISTS saml_claims_expires_at_index ON saml_claims (expires_at);
