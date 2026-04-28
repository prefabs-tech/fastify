import type { ClientConfigurationInput, ConnectionOptions } from "slonik";

type SlonikConfig = SlonikOptions;

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

export type { SlonikConfig, SlonikOptions };
