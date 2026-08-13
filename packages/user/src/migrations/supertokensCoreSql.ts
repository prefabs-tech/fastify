const SUPER_TOKENS_RELATION_NAMES = [
  "tenant_thirdparty_provider_clients",
  "tenant_thirdparty_providers",
  "emailverification_verified_emails",
  "emailpassword_pswd_reset_tokens",
  "passwordless_user_to_tenant",
  "thirdparty_user_to_tenant",
  "webauthn_account_recovery_tokens",
  "session_access_token_signing_keys",
  "tenant_configs",
  "all_auth_recipe_users",
  "dashboard_user_sessions",
  "emailverification_tokens",
  "emailpassword_user_to_tenant",
  "webauthn_generated_options",
  "webauthn_user_to_tenant",
  "app_id_to_user_id",
  "dashboard_users",
  "emailpassword_users",
  "jwt_signing_keys",
  "oauth_logout_challenges",
  "oauth_m2m_tokens",
  "oauth_sessions",
  "passwordless_codes",
  "passwordless_devices",
  "passwordless_users",
  "role_permissions",
  "session_info",
  "saml_clients",
  "saml_claims",
  "saml_relay_state",
  "tenant_configs",
  "tenant_thirdparty_provider_clients",
  "tenant_thirdparty_providers",
  "thirdparty_users",
  "totp_used_codes",
  "totp_user_devices",
  "user_last_active",
  "bulk_import_users",
  "key_value",
  "totp_users",
  "user_metadata",
  "userid_mapping",
  "oauth_clients",
  "webauthn_credentials",
  "webauthn_users",
  "apps",
  "roles",
  "tenants",
  "user_roles",
] as const;

const applyTableNamesPrefix = (sqlText: string, prefix = ""): string => {
  if (prefix.length === 0) {
    return sqlText;
  }

  let prefixedSql = sqlText;

  for (const name of SUPER_TOKENS_RELATION_NAMES) {
    const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const derivedPattern = new RegExp(
      `(?<![A-Za-z0-9_])${escaped}_(?=[A-Za-z0-9_])`,
      "g",
    );
    const pattern = new RegExp(
      `(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`,
      "g",
    );
    prefixedSql = prefixedSql.replaceAll(derivedPattern, `${prefix}${name}_`);
    prefixedSql = prefixedSql.replaceAll(pattern, `${prefix}${name}`);
  }

  return prefixedSql;
};

export { applyTableNamesPrefix, SUPER_TOKENS_RELATION_NAMES };
