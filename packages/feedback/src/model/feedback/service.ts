import { BaseService } from "@prefabs.tech/fastify-slonik";

import {
  Feedback,
  FeedbackCreateInput,
  FeedbackUpdateInput,
} from "../../types";
import FeedbackSqlFactory from "./sqlFactory";

class FeedbackService extends BaseService<
  Feedback,
  FeedbackCreateInput,
  FeedbackUpdateInput
> {
  get factory(): FeedbackSqlFactory {
    return super.factory as FeedbackSqlFactory;
  }

  get sqlFactoryClass() {
    return FeedbackSqlFactory;
  }
}

export default FeedbackService;
