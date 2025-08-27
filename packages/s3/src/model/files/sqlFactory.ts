import { DefaultSqlFactory } from "@prefabs.tech/fastify-slonik";

import { TABLE_FILES } from "../../constants";

class FileSqlFactory extends DefaultSqlFactory {
  static readonly TABLE = TABLE_FILES;

  get table() {
    return this.config.s3?.table?.name || super.table;
  }
}

export default FileSqlFactory;
