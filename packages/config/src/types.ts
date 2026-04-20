import type {
  DestinationStream,
  Level,
  LoggerOptions,
  StreamEntry,
} from "pino";

interface ApiConfig {
  appName: string;
  appOrigin: string[];
  apps?: AppConfig[];
  baseUrl: string;
  env: string;
  logger: {
    base?: LoggerOptions["base"];
    formatters?: LoggerOptions["formatters"];
    level: Level;
    prettyPrint?: {
      options: {
        colorize: boolean;
        ignore: string;
        translateTime: string;
      };
    };
    rotation?: {
      enabled: boolean;
      options: {
        compress?: boolean | Compressor | string;
        filenames: string[];
        interval?: string;
        maxFiles?: number;
        maxSize?: string;
        path: string;
        size?: string;
      };
    };
    streams?: (DestinationStream | StreamEntry)[];
    timestamp?: LoggerOptions["timestamp"];
    transport?: LoggerOptions["transport"];
  };
  name: string;
  pagination?: {
    default_limit: number;
    max_limit: number;
  };
  port: number;
  protocol: string;
  rest: {
    enabled: boolean;
  };
  version: string;
}

interface AppConfig {
  id: number;
  name: string;
  origin: string;
  supportedRoles: string[];
}

type Compressor = (source: string, destination: string) => string;

export type { ApiConfig, AppConfig };
