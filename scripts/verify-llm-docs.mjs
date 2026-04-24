#!/usr/bin/env node
/**
 * Phase 1: structural checks for docs/llm and README AI sections.
 * Optional: --update-verified (set Last verified SHA in REFERENCE.md)
 * Optional: --drift (fail if src changed vs merge-base without docs/README touch)
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const updateVerified = args.has("--update-verified");
const checkDrift = args.has("--drift");

const LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

function fail(msg) {
  console.error(`verify:llm-docs: ${msg}`);
  process.exit(1);
}

async function listPackages() {
  const packagesDir = path.join(repoRoot, "packages");
  const names = [];
  for (const ent of await readdir(packagesDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const pkgJson = path.join(packagesDir, ent.name, "package.json");
    try {
      await stat(pkgJson);
      names.push(ent.name);
    } catch {
      /* skip */
    }
  }
  return names.sort();
}

async function readText(p) {
  return readFile(p, "utf8");
}

function checkReferenceSections(referenceMd, packages) {
  for (const name of packages) {
    const needle = `\n## ${name}\n`;
    if (!referenceMd.includes(needle)) {
      fail(`docs/llm/REFERENCE.md missing section:${needle.trim()}`);
    }
  }
}

function checkWorkspaceIndex(indexMd, packages) {
  for (const name of packages) {
    const rel = `packages/${name}/docs/llm/INDEX.md`;
    if (!indexMd.includes(rel)) {
      fail(`docs/llm/INDEX.md must link to ${rel}`);
    }
  }
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** @param {string} mdPath absolute path to markdown file */
async function verifyLinksInFile(mdPath) {
  const text = await readText(mdPath);
  const baseDir = path.dirname(mdPath);
  let m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    const dest = m[2].trim();
    if (/^(https?:|mailto:)/i.test(dest)) continue;
    const [pathPart] = dest.split("#");
    if (!pathPart) continue;
    const resolved = path.normalize(path.join(baseDir, pathPart));
    if (!(await pathExists(resolved))) {
      fail(`Broken link in ${path.relative(repoRoot, mdPath)} → ${dest}`);
    }
  }
}

async function collectMarkdownFiles(rootDir) {
  /** @type {string[]} */
  const out = [];
  async function walk(dir) {
    for (const ent of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await walk(full);
      else if (ent.name.endsWith(".md")) out.push(full);
    }
  }
  await walk(rootDir);
  return out;
}

async function verifyAllDocLinks() {
  const roots = [path.join(repoRoot, "docs", "llm")];
  const packages = await listPackages();
  for (const name of packages) {
    roots.push(path.join(repoRoot, "packages", name, "docs", "llm"));
  }
  for (const root of roots) {
    if (!(await pathExists(root))) continue;
    const files = await collectMarkdownFiles(root);
    for (const f of files) await verifyLinksInFile(f);
  }
}

function checkPackageReadme(readmePath, label) {
  const required = ["## AI Quickstart", "docs/llm/INDEX.md", "docs/llm/REFERENCE.md"];
  return readText(readmePath).then((text) => {
    for (const s of required) {
      if (!text.includes(s)) fail(`${label} README.md must contain "${s}"`);
    }
  });
}

const REQUIRED_PUBLISH_FILES = ["dist", "docs/llm", "AGENTS.md", "llms.txt"];
const REFERENCE_URL_PREFIX =
  "https://github.com/prefabs-tech/fastify/blob/main/docs/llm/REFERENCE.md#";

async function checkPackageAgentPublish(name) {
  const pkgDir = path.join(repoRoot, "packages", name);
  const agentsPath = path.join(pkgDir, "AGENTS.md");
  const llmsPath = path.join(pkgDir, "llms.txt");
  if (!(await pathExists(agentsPath))) {
    fail(`Missing ${path.relative(repoRoot, agentsPath)}`);
  }
  if (!(await pathExists(llmsPath))) {
    fail(`Missing ${path.relative(repoRoot, llmsPath)}`);
  }
  const agentsText = await readText(agentsPath);
  const llmsText = await readText(llmsPath);
  const refUrl = `${REFERENCE_URL_PREFIX}${name}`;
  if (!agentsText.includes(refUrl)) {
    fail(`packages/${name}/AGENTS.md must include GitHub REFERENCE URL: ${refUrl}`);
  }
  if (!llmsText.includes(refUrl)) {
    fail(`packages/${name}/llms.txt must include GitHub REFERENCE URL: ${refUrl}`);
  }
  const pkgJsonPath = path.join(pkgDir, "package.json");
  const pkg = JSON.parse(await readText(pkgJsonPath));
  const files = pkg.files;
  if (!Array.isArray(files)) {
    fail(`packages/${name}/package.json must define a "files" array`);
  }
  for (const entry of REQUIRED_PUBLISH_FILES) {
    if (!files.includes(entry)) {
      fail(`packages/${name}/package.json "files" must include "${entry}"`);
    }
  }
}

function doUpdateVerified() {
  const refPath = path.join(repoRoot, "docs", "llm", "REFERENCE.md");
  let text = readFileSync(refPath, "utf8");
  const sha = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  const newLine = `- **Last verified:** \`${sha}\` — docs layout and links were checked against this commit; after meaningful public API, config, or route behavior changes, update [CHANGES.md](./CHANGES.md) if needed and bump this SHA with \`pnpm verify:llm-docs --update-verified\` once docs match reality.`;
  if (!/- \*\*Last verified:\*\* `/m.test(text)) {
    fail("docs/llm/REFERENCE.md: expected a line starting with - **Last verified:** `");
  }
  text = text.replace(/- \*\*Last verified:\*\* `[^`]+` —[^\n]*/m, newLine);
  writeFileSync(refPath, text);
  console.log(`verify:llm-docs: updated Last verified → ${sha}`);
}

function doDriftCheck() {
  const baseRef = process.env.GITHUB_BASE_REF || "main";
  let mergeBase;
  try {
    execSync(`git rev-parse --verify origin/${baseRef}`, {
      cwd: repoRoot,
      stdio: "pipe",
    });
    mergeBase = execSync(`git merge-base HEAD origin/${baseRef}`, {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
  } catch {
    console.warn(
      `verify:llm-docs: --drift skipped (no origin/${baseRef} or not a git clone with remotes)`,
    );
    return;
  }
  const changed = execSync(`git diff --name-only ${mergeBase}..HEAD`, {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  const srcTouch = changed.filter(
    (f) =>
      /^packages\/[^/]+\/src\//.test(f) &&
      !/\/__test__\//.test(f) &&
      !/\/__tests__\//.test(f) &&
      !/\.(test|spec)\.[cm]?ts$/.test(f),
  );
  if (srcTouch.length === 0) return;
  const docTouch = changed.some(
    (f) =>
      f.startsWith("docs/llm/") ||
      /^packages\/[^/]+\/README\.md$/.test(f) ||
      /^packages\/[^/]+\/docs\/llm\//.test(f) ||
      /^packages\/[^/]+\/AGENTS\.md$/.test(f) ||
      /^packages\/[^/]+\/llms\.txt$/.test(f),
  );
  if (!docTouch) {
    fail(
      `Drift: non-test source changed without docs/llm, package README, AGENTS.md, or llms.txt updates:\n${srcTouch.join(
        "\n",
      )}`,
    );
  }
}

async function main() {
  if (updateVerified) {
    doUpdateVerified();
  }

  const packages = await listPackages();
  const referenceMd = await readText(path.join(repoRoot, "docs", "llm", "REFERENCE.md"));
  const indexMd = await readText(path.join(repoRoot, "docs", "llm", "INDEX.md"));

  checkReferenceSections(referenceMd, packages);
  checkWorkspaceIndex(indexMd, packages);

  for (const name of packages) {
    const pkgIndex = path.join(repoRoot, "packages", name, "docs", "llm", "INDEX.md");
    if (!(await pathExists(pkgIndex))) {
      fail(`Missing ${path.relative(repoRoot, pkgIndex)}`);
    }
    await checkPackageAgentPublish(name);
  }

  await verifyAllDocLinks();

  await checkPackageReadme(path.join(repoRoot, "README.md"), "Workspace");

  for (const name of packages) {
    await checkPackageReadme(
      path.join(repoRoot, "packages", name, "README.md"),
      `packages/${name}`,
    );
  }

  if (checkDrift) {
    doDriftCheck();
  }

  console.log("verify:llm-docs: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
