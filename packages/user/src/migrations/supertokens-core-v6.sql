-- General Tables

CREATE TABLE IF NOT EXISTS st__apps  (
  app_id VARCHAR(64) NOT NULL DEFAULT 'public',
  created_at_time BIGINT,
  CONSTRAINT st__apps_pkey PRIMARY KEY(app_id)
);

INSERT INTO st__apps (app_id, created_at_time)
  VALUES ('public', 0) ON CONFLICT DO NOTHING;

------------------------------------------------------------

CREATE TABLE IF NOT EXISTS st__tenants (
  app_id VARCHAR(64) NOT NULL DEFAULT 'public',
  tenant_id VARCHAR(64) NOT NULL DEFAULT 'public',
  created_at_time BIGINT ,
  CONSTRAINT st__tenants_pkey
    PRIMARY KEY (app_id, tenant_id),
  CONSTRAINT st__tenants_app_id_fkey FOREIGN KEY(app_id)
    REFERENCES st__apps (app_id) ON DELETE CASCADE
);

INSERT INTO st__tenants (app_id, tenant_id, created_at_time)
  VALUES ('public', 'public', 0) ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS st__tenants_app_id_index ON st__tenants (app_id);

------------------------------------------------------------
ALTER TABLE st__key_value
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'public';

BEGIN;
ALTER TABLE st__key_value
  DROP CONSTRAINT IF EXISTS st__key_value_pkey;

ALTER TABLE st__key_value
  ADD CONSTRAINT st__key_value_pkey
    PRIMARY KEY (app_id, tenant_id, name);
COMMIT;

BEGIN;
ALTER TABLE st__key_value
  DROP CONSTRAINT IF EXISTS st__key_value_tenant_id_fkey;

ALTER TABLE st__key_value
  ADD CONSTRAINT st__key_value_tenant_id_fkey
    FOREIGN KEY (app_id, tenant_id)
    REFERENCES st__tenants (app_id, tenant_id) ON DELETE CASCADE;
COMMIT;

CREATE INDEX IF NOT EXISTS st__key_value_tenant_id_index ON st__key_value (app_id, tenant_id);

------------------------------------------------------------

CREATE TABLE IF NOT EXISTS st__app_id_to_user_id (
  app_id VARCHAR(64) NOT NULL DEFAULT 'public',
  user_id CHAR(36) NOT NULL,
  recipe_id VARCHAR(128) NOT NULL,
  CONSTRAINT st__app_id_to_user_id_pkey
    PRIMARY KEY (app_id, user_id),
  CONSTRAINT st__app_id_to_user_id_app_id_fkey
    FOREIGN KEY(app_id) REFERENCES st__apps (app_id) ON DELETE CASCADE
);

INSERT INTO st__app_id_to_user_id (user_id, recipe_id)
  SELECT user_id, recipe_id
  FROM st__all_auth_recipe_users ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS st__app_id_to_user_id_app_id_index ON st__app_id_to_user_id (app_id);

------------------------------------------------------------

ALTER TABLE st__all_auth_recipe_users
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__all_auth_recipe_users
  DROP CONSTRAINT st__all_auth_recipe_users_pkey CASCADE;

ALTER TABLE st__all_auth_recipe_users
  ADD CONSTRAINT st__all_auth_recipe_users_pkey
    PRIMARY KEY (app_id, tenant_id, user_id);

ALTER TABLE st__all_auth_recipe_users
  DROP CONSTRAINT IF EXISTS st__all_auth_recipe_users_tenant_id_fkey;

ALTER TABLE st__all_auth_recipe_users
  ADD CONSTRAINT st__all_auth_recipe_users_tenant_id_fkey
    FOREIGN KEY (app_id, tenant_id)
    REFERENCES st__tenants (app_id, tenant_id) ON DELETE CASCADE;

ALTER TABLE st__all_auth_recipe_users
  DROP CONSTRAINT IF EXISTS st__all_auth_recipe_users_user_id_fkey;

ALTER TABLE st__all_auth_recipe_users
  ADD CONSTRAINT st__all_auth_recipe_users_user_id_fkey
    FOREIGN KEY (app_id, user_id)
    REFERENCES st__app_id_to_user_id (app_id, user_id) ON DELETE CASCADE;

DROP INDEX IF EXISTS st__all_auth_recipe_users_pagination_index;

CREATE INDEX st__all_auth_recipe_users_pagination_index ON st__all_auth_recipe_users (time_joined DESC, user_id DESC, tenant_id DESC, app_id DESC);

CREATE INDEX IF NOT EXISTS st__all_auth_recipe_user_id_index ON st__all_auth_recipe_users (app_id, user_id);

CREATE INDEX IF NOT EXISTS st__all_auth_recipe_tenant_id_index ON st__all_auth_recipe_users (app_id, tenant_id);

-- Multitenancy

CREATE TABLE IF NOT EXISTS st__tenant_configs (
  connection_uri_domain VARCHAR(256) DEFAULT '',
  app_id VARCHAR(64) DEFAULT 'public',
  tenant_id VARCHAR(64) DEFAULT 'public',
  core_config TEXT,
  email_password_enabled BOOLEAN,
  passwordless_enabled BOOLEAN,
  third_party_enabled BOOLEAN,
  CONSTRAINT st__tenant_configs_pkey
    PRIMARY KEY (connection_uri_domain, app_id, tenant_id)
);

------------------------------------------------------------

CREATE TABLE IF NOT EXISTS st__tenant_thirdparty_providers (
  connection_uri_domain VARCHAR(256) DEFAULT '',
  app_id VARCHAR(64) DEFAULT 'public',
  tenant_id VARCHAR(64) DEFAULT 'public',
  third_party_id VARCHAR(28) NOT NULL,
  name VARCHAR(64),
  authorization_endpoint TEXT,
  authorization_endpoint_query_params TEXT,
  token_endpoint TEXT,
  token_endpoint_body_params TEXT,
  user_info_endpoint TEXT,
  user_info_endpoint_query_params TEXT,
  user_info_endpoint_headers TEXT,
  jwks_uri TEXT,
  oidc_discovery_endpoint TEXT,
  require_email BOOLEAN,
  user_info_map_from_id_token_payload_user_id VARCHAR(64),
  user_info_map_from_id_token_payload_email VARCHAR(64),
  user_info_map_from_id_token_payload_email_verified VARCHAR(64),
  user_info_map_from_user_info_endpoint_user_id VARCHAR(64),
  user_info_map_from_user_info_endpoint_email VARCHAR(64),
  user_info_map_from_user_info_endpoint_email_verified VARCHAR(64),
  CONSTRAINT st__tenant_thirdparty_providers_pkey
    PRIMARY KEY (connection_uri_domain, app_id, tenant_id, third_party_id),
  CONSTRAINT st__tenant_thirdparty_providers_tenant_id_fkey
    FOREIGN KEY(connection_uri_domain, app_id, tenant_id)
    REFERENCES st__tenant_configs (connection_uri_domain, app_id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS st__tenant_thirdparty_providers_tenant_id_index ON st__tenant_thirdparty_providers (connection_uri_domain, app_id, tenant_id);

------------------------------------------------------------

CREATE TABLE IF NOT EXISTS st__tenant_thirdparty_provider_clients (
  connection_uri_domain VARCHAR(256) DEFAULT '',
  app_id VARCHAR(64) DEFAULT 'public',
  tenant_id VARCHAR(64) DEFAULT 'public',
  third_party_id VARCHAR(28) NOT NULL,
  client_type VARCHAR(64) NOT NULL DEFAULT '',
  client_id VARCHAR(256) NOT NULL,
  client_secret TEXT,
  scope VARCHAR(128)[],
  force_pkce BOOLEAN,
  additional_config TEXT,
  CONSTRAINT st__tenant_thirdparty_provider_clients_pkey
    PRIMARY KEY (connection_uri_domain, app_id, tenant_id, third_party_id, client_type),
  CONSTRAINT st__tenant_thirdparty_provider_clients_third_party_id_fkey
    FOREIGN KEY (connection_uri_domain, app_id, tenant_id, third_party_id)
    REFERENCES st__tenant_thirdparty_providers (connection_uri_domain, app_id, tenant_id, third_party_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS st__tenant_thirdparty_provider_clients_third_party_id_index ON st__tenant_thirdparty_provider_clients (connection_uri_domain, app_id, tenant_id, third_party_id);

-- Session

ALTER TABLE st__session_info
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__session_info
  DROP CONSTRAINT st__session_info_pkey CASCADE;

ALTER TABLE st__session_info
  ADD CONSTRAINT st__session_info_pkey
    PRIMARY KEY (app_id, tenant_id, session_handle);

ALTER TABLE st__session_info
  DROP CONSTRAINT IF EXISTS st__session_info_tenant_id_fkey;

ALTER TABLE st__session_info
  ADD CONSTRAINT st__session_info_tenant_id_fkey
    FOREIGN KEY (app_id, tenant_id)
    REFERENCES st__tenants (app_id, tenant_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__session_expiry_index ON st__session_info (expires_at);

CREATE INDEX IF NOT EXISTS st__session_info_tenant_id_index ON st__session_info (app_id, tenant_id);

------------------------------------------------------------

ALTER TABLE st__session_access_token_signing_keys
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__session_access_token_signing_keys
  DROP CONSTRAINT st__session_access_token_signing_keys_pkey CASCADE;

ALTER TABLE st__session_access_token_signing_keys
  ADD CONSTRAINT st__session_access_token_signing_keys_pkey
    PRIMARY KEY (app_id, created_at_time);

ALTER TABLE st__session_access_token_signing_keys
  DROP CONSTRAINT IF EXISTS st__session_access_token_signing_keys_app_id_fkey;

ALTER TABLE st__session_access_token_signing_keys
  ADD CONSTRAINT st__session_access_token_signing_keys_app_id_fkey
    FOREIGN KEY (app_id)
    REFERENCES st__apps (app_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__access_token_signing_keys_app_id_index ON st__session_access_token_signing_keys (app_id);

-- JWT

ALTER TABLE st__jwt_signing_keys
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__jwt_signing_keys
  DROP CONSTRAINT st__jwt_signing_keys_pkey CASCADE;

ALTER TABLE st__jwt_signing_keys
  ADD CONSTRAINT st__jwt_signing_keys_pkey
    PRIMARY KEY (app_id, key_id);

ALTER TABLE st__jwt_signing_keys
  DROP CONSTRAINT IF EXISTS st__jwt_signing_keys_app_id_fkey;

ALTER TABLE st__jwt_signing_keys
  ADD CONSTRAINT st__jwt_signing_keys_app_id_fkey
    FOREIGN KEY (app_id)
    REFERENCES st__apps (app_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__jwt_signing_keys_app_id_index ON st__jwt_signing_keys (app_id);

-- EmailVerification

ALTER TABLE st__emailverification_verified_emails
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__emailverification_verified_emails
  DROP CONSTRAINT st__emailverification_verified_emails_pkey CASCADE;

ALTER TABLE st__emailverification_verified_emails
  ADD CONSTRAINT st__emailverification_verified_emails_pkey
    PRIMARY KEY (app_id, user_id, email);

ALTER TABLE st__emailverification_verified_emails
  DROP CONSTRAINT IF EXISTS st__emailverification_verified_emails_app_id_fkey;

ALTER TABLE st__emailverification_verified_emails
  ADD CONSTRAINT st__emailverification_verified_emails_app_id_fkey
    FOREIGN KEY (app_id)
    REFERENCES st__apps (app_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__emailverification_verified_emails_app_id_index ON st__emailverification_verified_emails (app_id);

------------------------------------------------------------

ALTER TABLE st__emailverification_tokens
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__emailverification_tokens
  DROP CONSTRAINT st__emailverification_tokens_pkey CASCADE;

ALTER TABLE st__emailverification_tokens
  ADD CONSTRAINT st__emailverification_tokens_pkey
    PRIMARY KEY (app_id, tenant_id, user_id, email, token);

ALTER TABLE st__emailverification_tokens
  DROP CONSTRAINT IF EXISTS st__emailverification_tokens_tenant_id_fkey;

ALTER TABLE st__emailverification_tokens
  ADD CONSTRAINT st__emailverification_tokens_tenant_id_fkey
    FOREIGN KEY (app_id, tenant_id)
    REFERENCES st__tenants (app_id, tenant_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__emailverification_tokens_tenant_id_index ON st__emailverification_tokens (app_id, tenant_id);

-- EmailPassword

ALTER TABLE st__emailpassword_users
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__emailpassword_users
  DROP CONSTRAINT st__emailpassword_users_pkey CASCADE;

ALTER TABLE st__emailpassword_users
  DROP CONSTRAINT IF EXISTS st__emailpassword_users_email_key CASCADE;

ALTER TABLE st__emailpassword_users
  ADD CONSTRAINT st__emailpassword_users_pkey
    PRIMARY KEY (app_id, user_id);

ALTER TABLE st__emailpassword_users
  DROP CONSTRAINT IF EXISTS st__emailpassword_users_user_id_fkey;

ALTER TABLE st__emailpassword_users
  ADD CONSTRAINT st__emailpassword_users_user_id_fkey
    FOREIGN KEY (app_id, user_id)
    REFERENCES st__app_id_to_user_id (app_id, user_id) ON DELETE CASCADE;

------------------------------------------------------------

CREATE TABLE IF NOT EXISTS st__emailpassword_user_to_tenant (
  app_id VARCHAR(64) DEFAULT 'public',
  tenant_id VARCHAR(64) DEFAULT 'public',
  user_id CHAR(36) NOT NULL,
  email VARCHAR(256) NOT NULL,
  CONSTRAINT st__emailpassword_user_to_tenant_email_key
    UNIQUE (app_id, tenant_id, email),
  CONSTRAINT st__emailpassword_user_to_tenant_pkey
    PRIMARY KEY (app_id, tenant_id, user_id),
  CONSTRAINT st__emailpassword_user_to_tenant_user_id_fkey
    FOREIGN KEY (app_id, tenant_id, user_id)
    REFERENCES st__all_auth_recipe_users (app_id, tenant_id, user_id) ON DELETE CASCADE
);

ALTER TABLE st__emailpassword_user_to_tenant
  DROP CONSTRAINT IF EXISTS st__emailpassword_user_to_tenant_email_key;

ALTER TABLE st__emailpassword_user_to_tenant
  ADD CONSTRAINT st__emailpassword_user_to_tenant_email_key
    UNIQUE (app_id, tenant_id, email);

ALTER TABLE st__emailpassword_user_to_tenant
  DROP CONSTRAINT IF EXISTS st__emailpassword_user_to_tenant_user_id_fkey;

ALTER TABLE st__emailpassword_user_to_tenant
  ADD CONSTRAINT st__emailpassword_user_to_tenant_user_id_fkey
    FOREIGN KEY (app_id, tenant_id, user_id)
    REFERENCES st__all_auth_recipe_users (app_id, tenant_id, user_id) ON DELETE CASCADE;

INSERT INTO st__emailpassword_user_to_tenant (user_id, email)
  SELECT user_id, email FROM st__emailpassword_users ON CONFLICT DO NOTHING;

------------------------------------------------------------

ALTER TABLE st__emailpassword_pswd_reset_tokens
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__emailpassword_pswd_reset_tokens
  DROP CONSTRAINT st__emailpassword_pswd_reset_tokens_pkey CASCADE;

ALTER TABLE st__emailpassword_pswd_reset_tokens
  ADD CONSTRAINT st__emailpassword_pswd_reset_tokens_pkey
    PRIMARY KEY (app_id, user_id, token);

ALTER TABLE st__emailpassword_pswd_reset_tokens
  DROP CONSTRAINT IF EXISTS st__emailpassword_pswd_reset_tokens_user_id_fkey;

ALTER TABLE st__emailpassword_pswd_reset_tokens
  ADD CONSTRAINT st__emailpassword_pswd_reset_tokens_user_id_fkey
    FOREIGN KEY (app_id, user_id)
    REFERENCES st__emailpassword_users (app_id, user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__emailpassword_pswd_reset_tokens_user_id_index ON st__emailpassword_pswd_reset_tokens (app_id, user_id);

-- Passwordless

ALTER TABLE st__passwordless_users
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__passwordless_users
  DROP CONSTRAINT st__passwordless_users_pkey CASCADE;

ALTER TABLE st__passwordless_users
  ADD CONSTRAINT st__passwordless_users_pkey
    PRIMARY KEY (app_id, user_id);

ALTER TABLE st__passwordless_users
  DROP CONSTRAINT IF EXISTS st__passwordless_users_email_key;

ALTER TABLE st__passwordless_users
  DROP CONSTRAINT IF EXISTS st__passwordless_users_phone_number_key;

ALTER TABLE st__passwordless_users
  DROP CONSTRAINT IF EXISTS st__passwordless_users_user_id_fkey;

ALTER TABLE st__passwordless_users
  ADD CONSTRAINT st__passwordless_users_user_id_fkey
    FOREIGN KEY (app_id, user_id)
    REFERENCES st__app_id_to_user_id (app_id, user_id) ON DELETE CASCADE;

------------------------------------------------------------

CREATE TABLE IF NOT EXISTS st__passwordless_user_to_tenant (
  app_id VARCHAR(64) DEFAULT 'public',
  tenant_id VARCHAR(64) DEFAULT 'public',
  user_id CHAR(36) NOT NULL,
  email VARCHAR(256),
  phone_number VARCHAR(256),
  CONSTRAINT st__passwordless_user_to_tenant_email_key
    UNIQUE (app_id, tenant_id, email),
  CONSTRAINT st__passwordless_user_to_tenant_phone_number_key
    UNIQUE (app_id, tenant_id, phone_number),
  CONSTRAINT st__passwordless_user_to_tenant_pkey
    PRIMARY KEY (app_id, tenant_id, user_id),
  CONSTRAINT st__passwordless_user_to_tenant_user_id_fkey
    FOREIGN KEY (app_id, tenant_id, user_id)
    REFERENCES st__all_auth_recipe_users (app_id, tenant_id, user_id) ON DELETE CASCADE
);

ALTER TABLE st__passwordless_user_to_tenant
  DROP CONSTRAINT IF EXISTS st__passwordless_user_to_tenant_user_id_fkey;

ALTER TABLE st__passwordless_user_to_tenant
  ADD CONSTRAINT st__passwordless_user_to_tenant_user_id_fkey
    FOREIGN KEY (app_id, tenant_id, user_id)
    REFERENCES st__all_auth_recipe_users (app_id, tenant_id, user_id) ON DELETE CASCADE;

INSERT INTO st__passwordless_user_to_tenant (user_id, email, phone_number)
  SELECT user_id, email, phone_number FROM st__passwordless_users ON CONFLICT DO NOTHING;

------------------------------------------------------------

ALTER TABLE st__passwordless_devices
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__passwordless_devices
  DROP CONSTRAINT st__passwordless_devices_pkey CASCADE;

ALTER TABLE st__passwordless_devices
  ADD CONSTRAINT st__passwordless_devices_pkey
    PRIMARY KEY (app_id, tenant_id, device_id_hash);

ALTER TABLE st__passwordless_devices
  DROP CONSTRAINT IF EXISTS st__passwordless_devices_tenant_id_fkey;

ALTER TABLE st__passwordless_devices
  ADD CONSTRAINT st__passwordless_devices_tenant_id_fkey
    FOREIGN KEY (app_id, tenant_id)
    REFERENCES st__tenants (app_id, tenant_id) ON DELETE CASCADE;

DROP INDEX IF EXISTS st__passwordless_devices_email_index;

CREATE INDEX IF NOT EXISTS st__passwordless_devices_email_index ON st__passwordless_devices (app_id, tenant_id, email);

DROP INDEX IF EXISTS st__passwordless_devices_phone_number_index;

CREATE INDEX IF NOT EXISTS st__passwordless_devices_phone_number_index ON st__passwordless_devices (app_id, tenant_id, phone_number);

CREATE INDEX IF NOT EXISTS st__passwordless_devices_tenant_id_index ON st__passwordless_devices (app_id, tenant_id);

------------------------------------------------------------

ALTER TABLE st__passwordless_codes
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__passwordless_codes
  DROP CONSTRAINT st__passwordless_codes_pkey CASCADE;

ALTER TABLE st__passwordless_codes
  ADD CONSTRAINT st__passwordless_codes_pkey
    PRIMARY KEY (app_id, tenant_id, code_id);

ALTER TABLE st__passwordless_codes
  DROP CONSTRAINT IF EXISTS st__passwordless_codes_device_id_hash_fkey;

ALTER TABLE st__passwordless_codes
  ADD CONSTRAINT st__passwordless_codes_device_id_hash_fkey
    FOREIGN KEY (app_id, tenant_id, device_id_hash)
    REFERENCES st__passwordless_devices (app_id, tenant_id, device_id_hash) ON DELETE CASCADE;

ALTER TABLE st__passwordless_codes
  DROP CONSTRAINT st__passwordless_codes_link_code_hash_key;

ALTER TABLE st__passwordless_codes
  DROP CONSTRAINT IF EXISTS st__passwordless_codes_link_code_hash_key;

ALTER TABLE st__passwordless_codes
  ADD CONSTRAINT st__passwordless_codes_link_code_hash_key
    UNIQUE (app_id, tenant_id, link_code_hash);

DROP INDEX IF EXISTS st__passwordless_codes_created_at_index;

CREATE INDEX IF NOT EXISTS st__passwordless_codes_created_at_index ON st__passwordless_codes (app_id, tenant_id, created_at);

DROP INDEX IF EXISTS st__passwordless_codes_device_id_hash_index;
CREATE INDEX IF NOT EXISTS st__passwordless_codes_device_id_hash_index ON st__passwordless_codes (app_id, tenant_id, device_id_hash);

-- ThirdParty

ALTER TABLE st__thirdparty_users
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__thirdparty_users
  DROP CONSTRAINT st__thirdparty_users_pkey CASCADE;

ALTER TABLE st__thirdparty_users
  DROP CONSTRAINT IF EXISTS st__thirdparty_users_user_id_key CASCADE;

ALTER TABLE st__thirdparty_users
  ADD CONSTRAINT st__thirdparty_users_pkey
    PRIMARY KEY (app_id, user_id);

ALTER TABLE st__thirdparty_users
  DROP CONSTRAINT IF EXISTS st__thirdparty_users_user_id_fkey;

ALTER TABLE st__thirdparty_users
  ADD CONSTRAINT st__thirdparty_users_user_id_fkey
    FOREIGN KEY (app_id, user_id)
    REFERENCES st__app_id_to_user_id (app_id, user_id) ON DELETE CASCADE;

DROP INDEX IF EXISTS st__thirdparty_users_thirdparty_user_id_index;

CREATE INDEX IF NOT EXISTS st__thirdparty_users_thirdparty_user_id_index ON st__thirdparty_users (app_id, third_party_id, third_party_user_id);

DROP INDEX IF EXISTS st__thirdparty_users_email_index;

CREATE INDEX IF NOT EXISTS st__thirdparty_users_email_index ON st__thirdparty_users (app_id, email);

------------------------------------------------------------

CREATE TABLE IF NOT EXISTS st__thirdparty_user_to_tenant (
  app_id VARCHAR(64) DEFAULT 'public',
  tenant_id VARCHAR(64) DEFAULT 'public',
  user_id CHAR(36) NOT NULL,
  third_party_id VARCHAR(28) NOT NULL,
  third_party_user_id VARCHAR(256) NOT NULL,
  CONSTRAINT st__thirdparty_user_to_tenant_third_party_user_id_key
    UNIQUE (app_id, tenant_id, third_party_id, third_party_user_id),
  CONSTRAINT st__thirdparty_user_to_tenant_pkey
    PRIMARY KEY (app_id, tenant_id, user_id),
  CONSTRAINT st__thirdparty_user_to_tenant_user_id_fkey
    FOREIGN KEY (app_id, tenant_id, user_id)
    REFERENCES st__all_auth_recipe_users (app_id, tenant_id, user_id) ON DELETE CASCADE
);

ALTER TABLE st__thirdparty_user_to_tenant
  DROP CONSTRAINT IF EXISTS st__thirdparty_user_to_tenant_third_party_user_id_key;

ALTER TABLE st__thirdparty_user_to_tenant
  ADD CONSTRAINT st__thirdparty_user_to_tenant_third_party_user_id_key
    UNIQUE (app_id, tenant_id, third_party_id, third_party_user_id);

ALTER TABLE st__thirdparty_user_to_tenant
  DROP CONSTRAINT IF EXISTS st__thirdparty_user_to_tenant_user_id_fkey;

ALTER TABLE st__thirdparty_user_to_tenant
  ADD CONSTRAINT st__thirdparty_user_to_tenant_user_id_fkey
    FOREIGN KEY (app_id, tenant_id, user_id)
    REFERENCES st__all_auth_recipe_users (app_id, tenant_id, user_id) ON DELETE CASCADE;

INSERT INTO st__thirdparty_user_to_tenant (user_id, third_party_id, third_party_user_id)
  SELECT user_id, third_party_id, third_party_user_id FROM st__thirdparty_users ON CONFLICT DO NOTHING;

-- UserIdMapping

ALTER TABLE st__userid_mapping
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__userid_mapping
  DROP CONSTRAINT IF EXISTS st__userid_mapping_pkey CASCADE;

ALTER TABLE st__userid_mapping
  ADD CONSTRAINT st__userid_mapping_pkey
    PRIMARY KEY (app_id, supertokens_user_id, external_user_id);

ALTER TABLE st__userid_mapping
  DROP CONSTRAINT IF EXISTS st__userid_mapping_supertokens_user_id_key;

ALTER TABLE st__userid_mapping
  ADD CONSTRAINT st__userid_mapping_supertokens_user_id_key
    UNIQUE (app_id, supertokens_user_id);

ALTER TABLE st__userid_mapping
  DROP CONSTRAINT IF EXISTS st__userid_mapping_external_user_id_key;

ALTER TABLE st__userid_mapping
  ADD CONSTRAINT st__userid_mapping_external_user_id_key
    UNIQUE (app_id, external_user_id);

ALTER TABLE st__userid_mapping
  DROP CONSTRAINT IF EXISTS st__userid_mapping_supertokens_user_id_fkey;

ALTER TABLE st__userid_mapping
  ADD CONSTRAINT st__userid_mapping_supertokens_user_id_fkey
    FOREIGN KEY (app_id, supertokens_user_id)
    REFERENCES st__app_id_to_user_id (app_id, user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__userid_mapping_supertokens_user_id_index ON st__userid_mapping (app_id, supertokens_user_id);

-- UserRoles

ALTER TABLE st__roles
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__roles
  DROP CONSTRAINT st__roles_pkey CASCADE;

ALTER TABLE st__roles
  ADD CONSTRAINT st__roles_pkey
    PRIMARY KEY (app_id, role);

ALTER TABLE st__roles
  DROP CONSTRAINT IF EXISTS st__roles_app_id_fkey;

ALTER TABLE st__roles
  ADD CONSTRAINT st__roles_app_id_fkey
    FOREIGN KEY (app_id)
    REFERENCES st__apps (app_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__roles_app_id_index ON st__roles (app_id);

------------------------------------------------------------

ALTER TABLE st__role_permissions
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__role_permissions
  DROP CONSTRAINT st__role_permissions_pkey CASCADE;

ALTER TABLE st__role_permissions
  ADD CONSTRAINT st__role_permissions_pkey
    PRIMARY KEY (app_id, role, permission);

ALTER TABLE st__role_permissions
  DROP CONSTRAINT IF EXISTS st__role_permissions_role_fkey;

ALTER TABLE st__role_permissions
  ADD CONSTRAINT st__role_permissions_role_fkey
    FOREIGN KEY (app_id, role)
    REFERENCES st__roles (app_id, role) ON DELETE CASCADE;

DROP INDEX IF EXISTS st__role_permissions_permission_index;

CREATE INDEX IF NOT EXISTS st__role_permissions_permission_index ON st__role_permissions (app_id, permission);

CREATE INDEX IF NOT EXISTS st__role_permissions_role_index ON st__role_permissions (app_id, role);

------------------------------------------------------------

ALTER TABLE st__user_roles
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__user_roles
  DROP CONSTRAINT st__user_roles_pkey CASCADE;

ALTER TABLE st__user_roles
  ADD CONSTRAINT st__user_roles_pkey
    PRIMARY KEY (app_id, tenant_id, user_id, role);

ALTER TABLE st__user_roles
  DROP CONSTRAINT IF EXISTS st__user_roles_tenant_id_fkey;

ALTER TABLE st__user_roles
  ADD CONSTRAINT st__user_roles_tenant_id_fkey
    FOREIGN KEY (app_id, tenant_id)
    REFERENCES st__tenants (app_id, tenant_id) ON DELETE CASCADE;

ALTER TABLE st__user_roles
  DROP CONSTRAINT IF EXISTS st__user_roles_role_fkey;

ALTER TABLE st__user_roles
  ADD CONSTRAINT st__user_roles_role_fkey
    FOREIGN KEY (app_id, role)
    REFERENCES st__roles (app_id, role) ON DELETE CASCADE;

DROP INDEX IF EXISTS st__user_roles_role_index;

CREATE INDEX IF NOT EXISTS st__user_roles_role_index ON st__user_roles (app_id, tenant_id, role);

CREATE INDEX IF NOT EXISTS st__user_roles_tenant_id_index ON st__user_roles (app_id, tenant_id);

CREATE INDEX IF NOT EXISTS st__user_roles_app_id_role_index ON st__user_roles (app_id, role);

-- UserMetadata

ALTER TABLE st__user_metadata
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__user_metadata
  DROP CONSTRAINT st__user_metadata_pkey CASCADE;

ALTER TABLE st__user_metadata
  ADD CONSTRAINT st__user_metadata_pkey
    PRIMARY KEY (app_id, user_id);

ALTER TABLE st__user_metadata
  DROP CONSTRAINT IF EXISTS st__user_metadata_app_id_fkey;

ALTER TABLE st__user_metadata
  ADD CONSTRAINT st__user_metadata_app_id_fkey
    FOREIGN KEY (app_id)
    REFERENCES st__apps (app_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__user_metadata_app_id_index ON st__user_metadata (app_id);

-- Dashboard

ALTER TABLE st__dashboard_users
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__dashboard_users
  DROP CONSTRAINT st__dashboard_users_pkey CASCADE;

ALTER TABLE st__dashboard_users
  ADD CONSTRAINT st__dashboard_users_pkey
    PRIMARY KEY (app_id, user_id);

ALTER TABLE st__dashboard_users
  DROP CONSTRAINT IF EXISTS st__dashboard_users_email_key;

ALTER TABLE st__dashboard_users
  ADD CONSTRAINT st__dashboard_users_email_key
    UNIQUE (app_id, email);

ALTER TABLE st__dashboard_users
  DROP CONSTRAINT IF EXISTS st__dashboard_users_app_id_fkey;

ALTER TABLE st__dashboard_users
  ADD CONSTRAINT st__dashboard_users_app_id_fkey
    FOREIGN KEY (app_id)
    REFERENCES st__apps (app_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__dashboard_users_app_id_index ON st__dashboard_users (app_id);

------------------------------------------------------------

ALTER TABLE st__dashboard_user_sessions
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__dashboard_user_sessions
  DROP CONSTRAINT st__dashboard_user_sessions_pkey CASCADE;

ALTER TABLE st__dashboard_user_sessions
  ADD CONSTRAINT st__dashboard_user_sessions_pkey
    PRIMARY KEY (app_id, session_id);

ALTER TABLE st__dashboard_user_sessions
  DROP CONSTRAINT IF EXISTS st__dashboard_user_sessions_user_id_fkey;

ALTER TABLE st__dashboard_user_sessions
  ADD CONSTRAINT st__dashboard_user_sessions_user_id_fkey
    FOREIGN KEY (app_id, user_id)
    REFERENCES st__dashboard_users (app_id, user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__dashboard_user_sessions_user_id_index ON st__dashboard_user_sessions (app_id, user_id);

-- TOTP

ALTER TABLE st__totp_users
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__totp_users
  DROP CONSTRAINT st__totp_users_pkey CASCADE;

ALTER TABLE st__totp_users
  ADD CONSTRAINT st__totp_users_pkey
    PRIMARY KEY (app_id, user_id);

ALTER TABLE st__totp_users
  DROP CONSTRAINT IF EXISTS st__totp_users_app_id_fkey;

ALTER TABLE st__totp_users
  ADD CONSTRAINT st__totp_users_app_id_fkey
    FOREIGN KEY (app_id)
    REFERENCES st__apps (app_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__totp_users_app_id_index ON st__totp_users (app_id);

------------------------------------------------------------

ALTER TABLE st__totp_user_devices
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__totp_user_devices
  DROP CONSTRAINT st__totp_user_devices_pkey;

ALTER TABLE st__totp_user_devices
  ADD CONSTRAINT st__totp_user_devices_pkey
    PRIMARY KEY (app_id, user_id, device_name);

ALTER TABLE st__totp_user_devices
  DROP CONSTRAINT IF EXISTS st__totp_user_devices_user_id_fkey;

ALTER TABLE st__totp_user_devices
  ADD CONSTRAINT st__totp_user_devices_user_id_fkey
    FOREIGN KEY (app_id, user_id)
    REFERENCES st__totp_users (app_id, user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__totp_user_devices_user_id_index ON st__totp_user_devices (app_id, user_id);

------------------------------------------------------------

ALTER TABLE st__totp_used_codes
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__totp_used_codes
  DROP CONSTRAINT st__totp_used_codes_pkey CASCADE;

ALTER TABLE st__totp_used_codes
  ADD CONSTRAINT st__totp_used_codes_pkey
    PRIMARY KEY (app_id, tenant_id, user_id, created_time_ms);

ALTER TABLE st__totp_used_codes
  DROP CONSTRAINT IF EXISTS st__totp_used_codes_user_id_fkey;

ALTER TABLE st__totp_used_codes
  ADD CONSTRAINT st__totp_used_codes_user_id_fkey
    FOREIGN KEY (app_id, user_id)
    REFERENCES st__totp_users (app_id, user_id) ON DELETE CASCADE;

ALTER TABLE st__totp_used_codes
  DROP CONSTRAINT IF EXISTS st__totp_used_codes_tenant_id_fkey;

ALTER TABLE st__totp_used_codes
  ADD CONSTRAINT st__totp_used_codes_tenant_id_fkey
    FOREIGN KEY (app_id, tenant_id)
    REFERENCES st__tenants (app_id, tenant_id) ON DELETE CASCADE;

DROP INDEX IF EXISTS st__totp_used_codes_expiry_time_ms_index;

CREATE INDEX IF NOT EXISTS st__totp_used_codes_expiry_time_ms_index ON st__totp_used_codes (app_id, tenant_id, expiry_time_ms);

CREATE INDEX IF NOT EXISTS st__totp_used_codes_user_id_index ON st__totp_used_codes (app_id, user_id);

CREATE INDEX IF NOT EXISTS st__totp_used_codes_tenant_id_index ON st__totp_used_codes (app_id, tenant_id);

-- ActiveUsers

ALTER TABLE st__user_last_active
  ADD COLUMN IF NOT EXISTS app_id VARCHAR(64) DEFAULT 'public';

ALTER TABLE st__user_last_active
  DROP CONSTRAINT st__user_last_active_pkey CASCADE;

ALTER TABLE st__user_last_active
  ADD CONSTRAINT st__user_last_active_pkey
    PRIMARY KEY (app_id, user_id);

ALTER TABLE st__user_last_active
  DROP CONSTRAINT IF EXISTS st__user_last_active_app_id_fkey;

ALTER TABLE st__user_last_active
  ADD CONSTRAINT st__user_last_active_app_id_fkey
    FOREIGN KEY (app_id)
    REFERENCES st__apps (app_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS st__user_last_active_app_id_index ON st__user_last_active (app_id);
