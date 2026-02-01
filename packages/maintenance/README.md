# @prefabs.tech/fastify-maintenance

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy way to put your APi in maintenance mode.

While in maintenance mode, all requests will elicit a response with error code 503 ("Service Unavailable").

According to the plugin's configuration, the response will include a `Retry-After` header with the estimate time until the server is available again.

## Features

### Set maintenance mode in the future

Set a date and time in the future for the maintenance mode to start.

### Set a end to maintenance mode

Set a date and time for the maintenance mode to end.

## Requirements

* [@prefabs.tech/fastify-config](../config/)

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-config @prefabs.tech/fastify-maintenance
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project" @prefabs.tech/fastify-config @prefabs.tech/fastify-maintenance
```

## Usage

### Register plugin

Register the fastify-maintenance plugin with your Fastify instance:

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import maintenancePlugin from "@prefabs.tech/fastify-maintenance";
import Fastify from "fastify";

import config from "./config";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify({
    logger: config.logger,
  });

  // Register config plugin
  await fastify.register(configPlugin, { config });
  
  // Register fastify-maintenance plugin
  await fastify.register(maintenancePlugin);
  
  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
}

start();
```

## Configuration

```typescript
const config: ApiConfig = {
  // ... other configurations
  
  maintenance: {
  }
};
```

