import { DefaultSqlFactory } from "@prefabs.tech/fastify-slonik";
import { QuerySqlToken, sql } from "slonik";

import { TABLE_USER_DEVICES } from "../../constants";

class UserDeviceSqlFactory extends DefaultSqlFactory {
  static readonly TABLE = TABLE_USER_DEVICES;

  get table() {
    return this.config.firebase.table?.userDevices?.name || super.table;
  }

  getDeleteExistingTokenSql(token: string): QuerySqlToken {
    return sql.type(this.validationSchema)`
      DELETE
      FROM ${this.tableFragment}
      ${this.getWhereFragment({ filterFragment: sql.fragment`device_token = ${token}` })}
      RETURNING *;
    `;
  }

  getFindByUserIdSql(userId: string): QuerySqlToken {
    return sql.type(this.validationSchema)`
      SELECT *
      FROM ${this.tableFragment}
      ${this.getWhereFragment({ filterFragment: sql.fragment`user_id = ${userId}` })};
    `;
  }
}

export default UserDeviceSqlFactory;
