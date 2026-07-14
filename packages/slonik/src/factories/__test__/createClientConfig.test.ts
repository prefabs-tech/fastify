import type { Query, QueryContext } from "slonik";

/* istanbul ignore file */
import { createTypeParserPreset } from "slonik";
import { describe, expect, it } from "vitest";

import fieldNameCaseConverter from "../../interceptors/fieldNameCaseConverter";
import resultParser from "../../interceptors/resultParser";
import { createBigintTypeParser } from "../../typeParsers/createBigintTypeParser";
import createClientConfig from "../createClientConfig";

describe("createClientConfiguration helper", () => {
  const defaultConfig = {
    captureStackTrace: false,
    connectionRetryLimit: 3,
    connectionTimeout: 5000,
    idleInTransactionSessionTimeout: 60000,
    idleTimeout: 5000,
    interceptors: [fieldNameCaseConverter, resultParser],
    maximumPoolSize: 10,
    queryRetryLimit: 5,
    statementTimeout: 60000,
    transactionRetryLimit: 5,
    typeParsers: [...createTypeParserPreset(), createBigintTypeParser()],
  };

  it("creates default configuration", () => {
    const config = createClientConfig();

    expect(config).toEqual(defaultConfig);
  });

  it("includes fieldNameCaseConvertor interceptor", () => {
    const interceptor = {
      transformQuery: (context: QueryContext, query: Query): Query => {
        return query;
      },
    };

    const config = createClientConfig({
      interceptors: [interceptor],
    });

    expect(config.interceptors).toContain(fieldNameCaseConverter);
  });

  it("includes query logging interceptor when queryLoggingEnabled is true", () => {
    const config = createClientConfig(undefined, true);
    // The logging interceptor is the extra one beyond fieldNameCaseConverter + resultParser
    expect(config.interceptors.length).toBeGreaterThan(2);
  });

  it("does not include query logging interceptor when queryLoggingEnabled is false", () => {
    const config = createClientConfig(undefined, false);
    expect(config.interceptors).toHaveLength(2);
  });

  it("does not include query logging interceptor when queryLoggingEnabled is undefined", () => {
    const config = createClientConfig();
    expect(config.interceptors).toHaveLength(2);
  });

  it("appends user interceptors after built-in interceptors", () => {
    const userInterceptor = {
      transformRow: (_context: unknown, _query: unknown, row: unknown) => row,
    };
    const config = createClientConfig({
      interceptors: [userInterceptor as never],
    });
    // built-ins come first, user interceptor is last
    expect(config.interceptors[0]).toBe(fieldNameCaseConverter);
    expect(config.interceptors[1]).toBe(resultParser);
    expect(config.interceptors.at(-1)).toBe(userInterceptor);
  });
});
