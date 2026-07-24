import { DefaultSqlFactory } from "@prefabs.tech/fastify-slonik";

import { TABLE_FEEDBACKS } from "../../constants";

class FeedbackSqlFactory extends DefaultSqlFactory {
  static readonly TABLE = TABLE_FEEDBACKS;

  get table() {
    return this.config.feedback.table?.feedbacks?.name || super.table;
  }
}

export default FeedbackSqlFactory;
