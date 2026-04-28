import type { Query, QueryContext } from "slonik";

/* istanbul ignore file */
import { createTypeParserPreset } from "slonik";
import { describe, expect, it } from "vitest";

import fieldNameCaseConverter from "../../interceptors/fieldNameCaseConverter";
import resultParser from "../../interceptors/resultParser";
import { createBigintTypeParser } from "../../typeParsers/createBigintTypeParser";
import createClientConfiguration from "../createClientConfiguration";

describe("createClientConfiguration helper", () => {
  const defaultConfiguration = {
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
    const configuration = createClientConfiguration();

    expect(configuration).toEqual(defaultConfiguration);
  });

  it("includes fieldNameCaseConvertor interceptor", () => {
    const interceptor = {
      transformQuery: (context: QueryContext, query: Query): Query => {
        return query;
      },
    };

    const configuration = createClientConfiguration({
      interceptors: [interceptor],
    });

    expect(configuration.interceptors).toContain(fieldNameCaseConverter);
  });

  it("includes query logging interceptor when queryLoggingEnabled is true", () => {
    const configuration = createClientConfiguration(undefined, true);
    // The logging interceptor is the extra one beyond fieldNameCaseConverter + resultParser
    expect(configuration.interceptors.length).toBeGreaterThan(2);
  });

  it("does not include query logging interceptor when queryLoggingEnabled is false", () => {
    const configuration = createClientConfiguration(undefined, false);
    expect(configuration.interceptors).toHaveLength(2);
  });

  it("does not include query logging interceptor when queryLoggingEnabled is undefined", () => {
    const configuration = createClientConfiguration();
    expect(configuration.interceptors).toHaveLength(2);
  });

  it("appends user interceptors after built-in interceptors", () => {
    const userInterceptor = {
      transformRow: (_context: unknown, _query: unknown, row: unknown) => row,
    };
    const configuration = createClientConfiguration({
      interceptors: [userInterceptor as never],
    });
    // built-ins come first, user interceptor is last
    expect(configuration.interceptors[0]).toBe(fieldNameCaseConverter);
    expect(configuration.interceptors[1]).toBe(resultParser);
    expect(configuration.interceptors.at(-1)).toBe(userInterceptor);
  });
});
