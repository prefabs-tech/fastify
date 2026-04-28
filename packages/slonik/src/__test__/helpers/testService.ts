import type { QueryResultRow } from "slonik";

import BaseService from "../../service";
import TestSqlFactory from "./sqlFactory";

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
