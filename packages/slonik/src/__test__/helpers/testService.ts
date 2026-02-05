import TestSqlFactory from "./sqlFactory";
import BaseService from "../../service";

import type { QueryResultRow } from "slonik";

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
