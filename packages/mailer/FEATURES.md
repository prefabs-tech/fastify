<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# @prefabs.tech/fastify-mailer — Features

## Plugin Registration

1. **Registration info log** — logs `info: Registering fastify-mailer plugin` on startup.

2. **Duplicate registration guard** — throws `"fastify-mailer has already been registered"` if you register the plugin twice on the same Fastify instance.

3. **Config fallback (legacy mode)** — when no options are passed to `register()`, reads config from `fastify.config.mailer` (requires `@prefabs.tech/fastify-config`). Emits a deprecation warning.

4. **Missing config error** — when neither inline options nor `fastify.config.mailer` is present, throws a descriptive error:

   ```
   Error: Missing mailer configuration. Did you forget to pass it to the mailer plugin?
   ```

5. **Fastify encapsulation bypass** — wrapped with `fastify-plugin` so `fastify.mailer` is available in all child plugins without re-registering.

## Transport

6. **SMTP transport creation** — calls `nodemailer.createTransport(transport, defaults)` to create the transporter. Compatible with any SMTP provider (AWS SES, Mailgun, SendGrid, Gmail, etc.).

7. **Default sender via `defaults.from`** — `defaults.from.address` and `defaults.from.name` are applied as global sender defaults to every email. Additional nodemailer `Options` (e.g., `replyTo`) can also be set under `defaults`.

## Compile-time Middleware

8. **MJML compile hook** — registers `nodemailerMjmlPlugin` on the nodemailer `"compile"` lifecycle with the configured `templateFolder`. Enables `.mjml` template files to be resolved, compiled to HTML, and interpolated before delivery.

9. **Auto HTML-to-text conversion** — registers `nodemailer-html-to-text` on the `"compile"` lifecycle after MJML. Automatically generates a plain-text `text` part from `html` for every email.

## `fastify.mailer` Decorator

10. **Full nodemailer `Transporter` API** — `fastify.mailer` exposes the entire nodemailer transporter interface (`verify()`, transport introspection, event hooks, etc.).

11. **Promise-based `sendMail`** — resolves with nodemailer's `SentMessageInfo`.

12. **Callback-based `sendMail`** — accepts an optional Node.js-style callback as the second argument.

## Template Data

13. **Global template data** — set `templateData` in plugin options to provide variables available in every email template without passing them per-email.

14. **Per-email template data** — pass `templateData` directly on each `sendMail` call for email-specific variables.

15. **Template data merge with override precedence** — per-email `templateData` is shallow-merged over the global config `templateData`. Per-email values win on key conflicts. The global object is never mutated.

## Recipient Override

16. **Redirect all emails to fixed addresses** — when `recipients` is a non-empty array, every outgoing email is redirected to those addresses regardless of the `to` field. `cc` and `bcc` are explicitly cleared to `undefined`.

## Test Infrastructure

17. **Conditional HTTP test route** — when `test.enabled` is `true`, registers a `GET` route at `test.path` that sends a test email to `test.to`. Omit `test` or set `test.enabled: false` to skip. Route returns:

    ```json
    {
      "status": "ok",
      "message": "Email successfully sent",
      "info": { "from": "...", "to": "..." }
    }
    ```

18. **Inline MJML compilation in test route** — the test email body is compiled inline via `mjml2html()`, not via the template folder mechanism.

19. **JSON Schema validation on test route** — 200 and 500 responses are validated against registered JSON schemas.

20. **OpenAPI tagging on test route** — tagged `["email"]` with summary `"Test email"` for Swagger/OpenAPI tools.

## TypeScript Integration

21. **`FastifyInstance` module augmentation** — importing the plugin adds `mailer: FastifyMailer` to Fastify's instance type automatically.

22. **`ApiConfig` module augmentation** — importing the plugin extends `@prefabs.tech/fastify-config`'s `ApiConfig` with `mailer: MailerConfig`.

23. **Exported types** — `FastifyMailer`, `FastifyMailerNamedInstance`, and `MailerConfig` are exported for use in application code.
