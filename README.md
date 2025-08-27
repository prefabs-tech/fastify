# @prefabs.tech/fastify
A set of fastify libraries


## Packages
  - @prefabs.tech/fastify-config (https://www.npmjs.com/package/@prefabs.tech/fastify-config)
  - @prefabs.tech/fastify-graphql (https://www.npmjs.com/package/@prefabs.tech/fastify-graphql)
  - @prefabs.tech/fastify-mailer (https://www.npmjs.com/package/@prefabs.tech/fastify-mailer)
  - @prefabs.tech/fastify-s3 (https://www.npmjs.com/package/@prefabs.tech/fastify-s3)
  - @prefabs.tech/fastify-slonik (https://www.npmjs.com/package/@prefabs.tech/fastify-slonik)
  - @prefabs.tech/fastify-user (https://www.npmjs.com/package/@prefabs.tech/fastify-user)

## Installation & Usage

### Install dependencies
Install dependencies recursively with this command
```
make install
```

### Build all packages
```
make build
```

### Lint code
```
make lint
```

### Typecheck code
```
make typecheck
```

### Test
```
make test
```

## Developing locally & testing
The best way to verify the changes done to the libraries is to test them locally before releasing them. To test libraries locally link each libraries to the `fastify-api` using `pnpm link` command. [More on pnpm link](https://pnpm.io/cli/link).

To link and unlink the library locally run these commands from the `fastify-api` where you are linking the library:
```
pnpm link ./<path_to_libraries_monorepo>/packages/<library_name>
```

To unlink the linked library
```
pnpm unlink ./<path_to_libraries_monorepo>/packages/<library_name>
```

## Troubleshooting
  - Make sure that `package.json` and `pnpm-lock.yml` are synchronized.
  - You may need to restart your fastify api before link and unlink to see the changes.
  - All the libraries that defines or uses context has to be linked in order to link one libraries that use the context or defines it.
