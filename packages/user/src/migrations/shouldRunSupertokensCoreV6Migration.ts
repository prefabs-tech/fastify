import type { QueryFunction } from "slonik";

import { sql } from "slonik";

/**
 * Run the embedded SuperTokens core v6 dump only for legacy schemas:
 * ST tables exist but account-linking (`primary_or_recipe_user_id`) does not.
 * Skip on core ≥7/9 (column present) and when ST tables are absent (fresh core
 * owns schema creation).
 */
const shouldRunSupertokensCoreV6Migration = async (connection: {
  query: QueryFunction;
}): Promise<boolean> => {
  const result = await connection.query(sql.unsafe`
    SELECT (
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'st__all_auth_recipe_users'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'st__app_id_to_user_id'
          AND column_name = 'primary_or_recipe_user_id'
      )
    ) AS "shouldRun"
  `);

  const row = result.rows[0] as undefined | { shouldRun?: boolean };

  return row?.shouldRun === true;
};

export default shouldRunSupertokensCoreV6Migration;
