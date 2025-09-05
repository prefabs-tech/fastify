import type { ClientConfigurationInput, ConnectionOptions } from "slonik";

type SlonikOptions = {
  clientConfiguration?: ClientConfigurationInput;
  db: ConnectionOptions;
  extensions?: string[];
  migrations?: {
    path: string;
  };
  pagination?: {
    defaultLimit: number;
    maxLimit: number;
  };
  queryLogging?: {
    enabled: boolean;
  };
};

type SlonikConfig = SlonikOptions;

export type { SlonikConfig, SlonikOptions };
