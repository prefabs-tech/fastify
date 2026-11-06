import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

// Imports the built bundle in a plain Node process (requires `pnpm build`): vitest's own
// resolver accepts extensionless directory imports that Node's ESM loader rejects.
describe("ESM bundle", () => {
  // The 30s timeout: starting a Node process can outlast the 5s default while
  // every package's tests run in parallel
  it("loads in Node without module resolution errors", async () => {
    const bundle = new URL(
      "../../dist/prefabs-tech-fastify-user.js",
      import.meta.url,
    );

    await expect(
      promisify(execFile)(process.execPath, [
        "--input-type=module",
        "--eval",
        `await import(${JSON.stringify(bundle.href)});`,
      ]),
    ).resolves.toBeDefined();
  }, 30000);
});
