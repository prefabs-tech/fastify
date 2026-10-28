import type { QueryResultRow } from "slonik";

import BaseService from "../../service.js";
import TestSqlFactory from "./sqlFactory.js";

class TestService<
  T extends QueryResultRow,
  C extends QueryResultRow,
  U extends QueryResultRow,
> extends BaseService<T, C, U> {
  get sqlFactoryClass() {
    return TestSqlFactory;
  }
}

export default TestService;
