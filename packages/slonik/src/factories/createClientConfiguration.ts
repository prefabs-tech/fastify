import { createTypeParserPreset } from "slonik";
import { createQueryLoggingInterceptor } from "slonik-interceptor-query-logging";

import fieldNameCaseConverter from "../interceptors/fieldNameCaseConverter";
import resultParser from "../interceptors/resultParser";
import { createBigintTypeParser } from "../typeParsers/createBigintTypeParser";

import type { ClientConfigurationInput } from "slonik";

const createClientConfiguration = (
  config?: ClientConfigurationInput,
  queryLoggingEnabled?: boolean,
): ClientConfigurationInput => {
  const configuration = {
    captureStackTrace: false,
    connectionRetryLimit: 3,
    connectionTimeout: 5000,
    idleInTransactionSessionTimeout: 60000,
    idleTimeout: 5000,
    interceptors: [],
    maximumPoolSize: 10,
    queryRetryLimit: 5,
    statementTimeout: 60000,
    transactionRetryLimit: 5,
    typeParsers: [...createTypeParserPreset(), createBigintTypeParser()],

    ...config,
  };

  return {
    ...configuration,
    interceptors: [
      fieldNameCaseConverter,
      resultParser,
      ...(queryLoggingEnabled ? [createQueryLoggingInterceptor()] : []),
      ...(config?.interceptors ?? []),
    ],
  };
};

export default createClientConfiguration;
