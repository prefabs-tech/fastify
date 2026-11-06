import DefaultSqlFactory from "../../sqlFactory.js";

class TestSqlFactory extends DefaultSqlFactory {
  static readonly TABLE = "test";
}

export default TestSqlFactory;
