import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { QuerySqlToken } from "slonik";

import { TABLE_USERS } from "@prefabs.tech/fastify-user";
import { sql } from "slonik";

const addPhoneNumberInUsersTableQuery = (config: ApiConfig): QuerySqlToken => {
  const users = config.user.tables?.users?.name || TABLE_USERS;

  return sql.unsafe`
    ALTER TABLE ${sql.identifier([users])}
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR ( 20 );
  `;
};

export { addPhoneNumberInUsersTableQuery };
