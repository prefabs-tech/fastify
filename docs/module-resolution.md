# Module resolution in tsconfig

`moduleResolution` sets the algorithm TypeScript uses to find the file behind an import specifier (`"./types"`, `"fastify"`, `"supertokens-node/recipe/session"`). It should match whatever loads the code at runtime. If they differ, `tsc` passes code that fails in Node, or rejects code that would run fine.

It works alongside `module`, which sets the output format TypeScript checks your import syntax against. For `node16`/`nodenext` the two settings must match.

## The options

| Value | Mimics | Extensions required? | Reads `package.json` `exports`? | Directory `index` lookup? |
|---|---|---|---|---|
| `node10` (old name `node`) | Node's CommonJS `require` before v12 | No | **No**: falls back to `main`/`types` | Yes |
| `node16` / `nodenext` | Node's actual ESM + CJS loader | **Yes, in ESM files** | Yes, with `import`/`require`/`types` conditions | Only in CJS files |
| `bundler` | Vite, esbuild, webpack | No | Yes, with the `import` condition | Yes |
| `classic` | Pre-npm TypeScript | — | No | No (don't use it) |

## What `nodenext` does

Under `nodenext`, each file's format decides the rules for its imports:

- A `.ts` file is ESM when the nearest `package.json` has `"type": "module"`. It is CJS otherwise. `.mts`/`.cts` force the format either way.
- **In ESM files:**
  - Relative imports must name the emitted file: `"./types.js"`, even though the source is `types.ts`. TypeScript maps `.js` back to `.ts` and never rewrites the specifier.
  - Directories are not resolved: `"../supertokens"` must be written `"../supertokens/index.js"`.
  - Deep imports into a package with no `exports` map must name the file: `"supertokens-node/recipe/session/index.js"`.
  - If a package has an `exports` map, only the subpaths it lists can be imported. The `import` or `require` condition is chosen to match the importing file's format, plus `types`.
- **CJS interop:** if a CJS `.d.ts` has `export default`, a default import gives you the whole `module.exports` namespace, not the default value. That is why mistake #24 in AGENTS.md says to use named exports instead.

`node16` and `nodenext` behave the same today. `nodenext` follows newer Node behavior as TypeScript adds it.

## How this repo uses it

- Every package's `tsconfig.json` extends `@prefabs.tech/tsconfig/fastify.json`, the preset for fastify libraries. Since `@prefabs.tech/tsconfig` 0.10.0 it sets `module` and `moduleResolution` to `NodeNext`, in place of the shared base config's `module: ES2022` with `moduleResolution: Bundler`. The packages don't override either setting. That is why every relative import in `src/` ends in `.js` or `/index.js`. To see what a package actually gets, run `npx tsc --showConfig` in its directory.
- Vite builds the JavaScript, and `tsc` only emits `.d.ts` files (`--emitDeclarationOnly`). So `moduleResolution` here mainly controls two things:
  1. **Type-checking against how Node really loads `dist/`.** Code that passes `nodenext` won't throw `ERR_UNSUPPORTED_DIR_IMPORT` at runtime. `src/__test__/esm.test.ts` checks this by loading the bundle in real Node.
  2. **The specifiers written into the published `.d.ts` files.** Consumers resolve those with their own `moduleResolution`, which may be `nodenext`, `bundler` or `node10`. Code written for `nodenext` works for all three, but code written for `bundler` breaks for `nodenext` consumers. `pnpm attw` checks the packed tarballs under each mode.
- vitest uses Vite's resolver, which is lenient like `bundler`. So tests pass even with extensionless imports. Only `tsc` (typecheck/build) and the ESM test catch them.

## A related trap: `baseUrl`

`packages/user/tsconfig.json` sets `"baseUrl": "./"`. That lets `import X from "src/model/..."` type-check, because TypeScript resolves non-relative names against `baseUrl`. Node doesn't do this, so the import fails at runtime. With `nodenext` you don't need `baseUrl`, and removing it would make TypeScript reject that kind of import.

## Rule of thumb

- **Library run directly by Node, or published for others:** use `module` + `moduleResolution: nodenext`.
- **App always built by a bundler:** use `module: esnext` (or `preserve`) + `moduleResolution: bundler`.
- **Avoid `node10`** in new configs. It ignores `exports`, so it can pick a different file than Node does.
