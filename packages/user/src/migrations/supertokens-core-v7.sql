ALTER TABLE st__all_auth_recipe_users
  ADD COLUMN IF NOT EXISTS primary_or_recipe_user_id CHAR(36) NOT NULL DEFAULT ('0');

ALTER TABLE st__all_auth_recipe_users
  ADD COLUMN IF NOT EXISTS is_linked_or_is_a_primary_user BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE st__all_auth_recipe_users
  ADD COLUMN IF NOT EXISTS primary_or_recipe_user_time_joined BIGINT NOT NULL DEFAULT 0;

UPDATE st__all_auth_recipe_users
  SET primary_or_recipe_user_id = user_id
  WHERE primary_or_recipe_user_id = '0';

UPDATE st__all_auth_recipe_users
  SET primary_or_recipe_user_time_joined = time_joined
  WHERE primary_or_recipe_user_time_joined = 0;

ALTER TABLE st__all_auth_recipe_users
  DROP CONSTRAINT IF EXISTS st__all_auth_recipe_users_primary_or_recipe_user_id_fkey;

ALTER TABLE st__all_auth_recipe_users
  ADD CONSTRAINT st__all_auth_recipe_users_primary_or_recipe_user_id_fkey
    FOREIGN KEY (app_id, primary_or_recipe_user_id)
    REFERENCES st__app_id_to_user_id (app_id, user_id) ON DELETE CASCADE;

ALTER TABLE st__all_auth_recipe_users
  ALTER primary_or_recipe_user_id DROP DEFAULT;

ALTER TABLE st__app_id_to_user_id
  ADD COLUMN IF NOT EXISTS primary_or_recipe_user_id CHAR(36) NOT NULL DEFAULT ('0');

ALTER TABLE st__app_id_to_user_id
  ADD COLUMN IF NOT EXISTS is_linked_or_is_a_primary_user BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE st__app_id_to_user_id
  SET primary_or_recipe_user_id = user_id
  WHERE primary_or_recipe_user_id = '0';

ALTER TABLE st__app_id_to_user_id
  DROP CONSTRAINT IF EXISTS st__app_id_to_user_id_primary_or_recipe_user_id_fkey;

ALTER TABLE st__app_id_to_user_id
  ADD CONSTRAINT st__app_id_to_user_id_primary_or_recipe_user_id_fkey
    FOREIGN KEY (app_id, primary_or_recipe_user_id)
    REFERENCES st__app_id_to_user_id (app_id, user_id) ON DELETE CASCADE;

ALTER TABLE st__app_id_to_user_id
    ALTER primary_or_recipe_user_id DROP DEFAULT;

DROP INDEX IF EXISTS st__all_auth_recipe_users_pagination_index;

CREATE INDEX IF NOT EXISTS st__all_auth_recipe_users_pagination_index1 ON st__all_auth_recipe_users (
  app_id, tenant_id, primary_or_recipe_user_time_joined DESC, primary_or_recipe_user_id DESC);

CREATE INDEX IF NOT EXISTS st__all_auth_recipe_users_pagination_index2 ON st__all_auth_recipe_users (
  app_id, tenant_id, primary_or_recipe_user_time_joined ASC, primary_or_recipe_user_id DESC);

CREATE INDEX IF NOT EXISTS st__all_auth_recipe_users_pagination_index3 ON st__all_auth_recipe_users (
  recipe_id, app_id, tenant_id, primary_or_recipe_user_time_joined DESC, primary_or_recipe_user_id DESC);

CREATE INDEX IF NOT EXISTS st__all_auth_recipe_users_pagination_index4 ON st__all_auth_recipe_users (
  recipe_id, app_id, tenant_id, primary_or_recipe_user_time_joined ASC, primary_or_recipe_user_id DESC);

CREATE INDEX IF NOT EXISTS st__all_auth_recipe_users_primary_user_id_index ON st__all_auth_recipe_users (primary_or_recipe_user_id, app_id);

CREATE INDEX IF NOT EXISTS st__all_auth_recipe_users_recipe_id_index ON st__all_auth_recipe_users (app_id, recipe_id, tenant_id);

ALTER TABLE st__emailpassword_pswd_reset_tokens DROP CONSTRAINT IF EXISTS st__emailpassword_pswd_reset_tokens_user_id_fkey;

ALTER TABLE st__emailpassword_pswd_reset_tokens ADD CONSTRAINT st__emailpassword_pswd_reset_tokens_user_id_fkey FOREIGN KEY (app_id, user_id) REFERENCES st__app_id_to_user_id (app_id, user_id) ON DELETE CASCADE;

ALTER TABLE st__emailpassword_pswd_reset_tokens ADD COLUMN IF NOT EXISTS email VARCHAR(256);
