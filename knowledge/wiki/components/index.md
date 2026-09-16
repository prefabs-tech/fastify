# Components

One concept per app, library, service, or tool in the project.

# Foundation

- [fastify-config](config.md) - The package that decorates the Fastify instance and every request with the app's ApiConfig object and defines the base ApiConfig type other packages augment.
- [fastify-error-handler](error-handler.md) - The package that installs @fastify/sensible, the root error handler with response masking and a domain-error status map, the shared ErrorResponse JSON schema, and the CustomError class.
- [fastify-slonik](slonik.md) - The Postgres foundation package, providing the connection-verified slonik pool and decorators, boot-time extensions, the SQL-file migration plugin, and the BaseService/DefaultSqlFactory/filter toolkit every data package extends.
- [fastify-graphql](graphql.md) - The mercurius wrapper package, which owns GraphQL enablement, the request context builder with its plugin extension point, the shared base schema, and the multipart upload transport.
- [fastify-swagger](swagger.md) - A thin wrapper that registers @fastify/swagger and @fastify/swagger-ui behind an enabled flag and exposes the documentation route prefix as decorators.

# Feature packages

- [fastify-user](user.md) - The identity package, which integrates SuperTokens (sessions, email/password and third-party sign-in, roles, email verification) with an app-owned users table, and adds invitations, roles and permissions, profile fields, profile photos, and GraphQL auth directives.
- [fastify-phone-auth](phone-auth.md) - The passwordless phone login package, which contributes a SuperTokens passwordless recipe through the user package's recipe registry, bridges SuperTokens to Twilio Verify with a placeholder code, and supports dev-mode and bypass numbers.
- [fastify-s3](s3.md) - The file storage package, with a files table, REST multipart parsing, the FileService upload/download/presign/delete flow over the AWS SDK, filename collision strategies, and an Ajv isFile keyword.
- [fastify-firebase](firebase.md) - The push notification package, providing firebase-admin initialization, a user_devices table mapping FCM tokens to users, device REST and GraphQL endpoints, an optional test-notification route, and an opt-in App Check middleware.
- [fastify-mailer](mailer.md) - The nodemailer wrapper package that compiles MJML templates, merges global and per-email template data, can redirect all outgoing mail to fixed recipients, and optionally exposes a test-email route.
