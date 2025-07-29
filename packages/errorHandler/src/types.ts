interface AppConfig {
  id: number;
  name: string;
  origin: string;
  supportedRoles: string[];
}

interface ApiConfig {
  appName: string;
  appOrigin: string[];
  apps?: AppConfig[];
  baseUrl: string;
  env: string;
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

export type { ApiConfig, AppConfig };
