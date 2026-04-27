#!/usr/bin/env node
/**
 * Deterministic docs: llms.txt, REFERENCE package sections, README API tables.
 * Run from repo root: pnpm docs:generate
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import Handlebars from "handlebars";
import { Project } from "ts-morph";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const MANIFEST_PATH = join(REPO_ROOT, "docgen.manifest.json");
const REFERENCE_PATH = join(REPO_ROOT, "docs", "llm", "REFERENCE.md");
const MARKER_START = "<!-- docgen:packages:start -->";
const MARKER_END = "<!-- docgen:packages:end -->";
const README_START = "<!-- docgen:readme:start -->";
const README_END = "<!-- docgen:readme:end -->";

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    return { githubBlobBase: "", packages: {} };
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function discoverPackages(manifest) {
  const packagesDir = join(REPO_ROOT, "packages");
  const byDir = new Map();
  for (const ent of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const dir = ent.name;
    const pjPath = join(packagesDir, dir, "package.json");
    if (!existsSync(pjPath)) continue;
    const pj = JSON.parse(readFileSync(pjPath, "utf8"));
    if (!pj.name?.startsWith("@prefabs.tech/fastify-")) continue;
    byDir.set(dir, { dir, npmName: pj.name, packageJson: pj });
  }
  const order = manifest.packageOrder?.filter((d) => byDir.has(d));
  const out = [];
  if (order?.length) {
    for (const d of order) out.push(byDir.get(d));
    for (const d of [...byDir.keys()].sort()) {
      if (!order.includes(d)) out.push(byDir.get(d));
    }
  } else {
    out.push(...[...byDir.values()].sort((a, b) => a.dir.localeCompare(b.dir)));
  }
  return out;
}

function findTestFiles(packageRoot) {
  const srcRoot = join(packageRoot, "src");
  if (!existsSync(srcRoot)) return [];
  const out = [];
  function walk(dir) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) {
        walk(p);
      } else if (
        name.isFile() &&
        (name.name.endsWith(".test.ts") || name.name.endsWith(".spec.ts"))
      ) {
        const rel = relative(packageRoot, p).split(sep).join("/");
        if (rel.includes("__test__/")) out.push(rel);
      }
    }
  }
  walk(srcRoot);
  return [...new Set(out)].sort();
}

function testDisplayPath(relFromPackageRoot) {
  return relFromPackageRoot.replace(/\/__test__\//g, "/**test**/");
}

function mdLinkFromDocsLlrel(repoRelPath, displayOverride) {
  const mdRel = `../../${repoRelPath}`;
  const display =
    displayOverride ?? repoRelPath.replace(/\/__test__\//g, "/**test**/");
  return `[${display}](${mdRel})`;
}

function buildUsageDemoLine(pkg, manifestEntry) {
  const pkgRoot = join(REPO_ROOT, "packages", pkg.dir);
  const curated = Boolean(manifestEntry?.testFilesOnly?.length);
  let files = curated
    ? manifestEntry.testFilesOnly.filter((f) => existsSync(join(pkgRoot, f)))
    : findTestFiles(pkgRoot);
  for (const extra of manifestEntry?.usageDemoExtraPaths ?? []) {
    const p = join(pkgRoot, extra);
    if (existsSync(p) && !files.includes(extra)) files.push(extra);
  }
  if (!curated) files.sort();
  const repoPrefix = `packages/${pkg.dir}/`;
  const links = files.map((f) =>
    mdLinkFromDocsLlrel(`${repoPrefix}${f}`, `${repoPrefix}${testDisplayPath(f)}`),
  );
  const body = links.join(" · ");
  const suffix = manifestEntry?.usageSuffix;
  if (!body && suffix) {
    return `- **usage / “demo”:** ${suffix}`;
  }
  if (suffix) {
    return `- **usage / “demo”:** ${body} ${suffix}`;
  }
  return `- **usage / “demo”:** ${body}`;
}

function buildPackageReferenceSection(pkg, manifest) {
  const m = manifest.packages?.[pkg.dir] ?? {};
  const base = `packages/${pkg.dir}`;
  const docLinks = [
    mdLinkFromDocsLlrel(`${base}/GUIDE.md`),
    mdLinkFromDocsLlrel(`${base}/README.md`),
  ];
  for (const extra of m.extraDocs ?? []) {
    docLinks.push(mdLinkFromDocsLlrel(`${base}/${extra}`));
  }
  const srcLinks = [
    mdLinkFromDocsLlrel(`${base}/src/index.ts`),
    mdLinkFromDocsLlrel(`${base}/src/plugin.ts`),
  ];
  const usage = buildUsageDemoLine(pkg, m);

  return [
    `## ${pkg.dir}`,
    "",
    `- **npm:** \`${pkg.npmName}\``,
    `- **docs:** ${docLinks.join(" · ")}`,
    `- **source:** ${srcLinks.join(" · ")}`,
    usage,
    "",
  ].join("\n");
}

function phaseLlms(packages, manifest) {
  const githubBase =
    manifest.githubBlobBase || "https://github.com/prefabs-tech/fastify/blob/main";
  const tplPkg = Handlebars.compile(
    readFileSync(join(__dirname, "templates", "llms-package.hbs"), "utf8"),
  );
  const tplRoot = Handlebars.compile(
    readFileSync(join(__dirname, "templates", "llms-root.hbs"), "utf8"),
  );

  for (const pkg of packages) {
    const referenceUrlGitHub = `${githubBase}/docs/llm/REFERENCE.md#${pkg.dir}`;
    const text = tplPkg({ npmName: pkg.npmName, referenceUrlGitHub });
    writeFileSync(join(REPO_ROOT, "packages", pkg.dir, "llms.txt"), text);
  }

  const rootText = tplRoot({
    packages: packages.map((p) => ({
      npmName: p.npmName,
      packageDir: p.dir,
    })),
  });
  writeFileSync(join(REPO_ROOT, "llms.txt"), rootText);
}

function phaseReference(packages, manifest) {
  if (!existsSync(REFERENCE_PATH)) {
    console.warn("REFERENCE.md missing, skip phase 2");
    return;
  }
  let content = readFileSync(REFERENCE_PATH, "utf8");
  if (!content.includes(MARKER_START) || !content.includes(MARKER_END)) {
    console.warn("REFERENCE.md missing docgen markers, skip phase 2");
    return;
  }
  const blocks = packages.map((p) => buildPackageReferenceSection(p, manifest));
  const generated =
    "\n\n" + blocks.join("\n---\n\n") + "\n\n";
  const before = content.split(MARKER_START)[0];
  const after = content.split(MARKER_END)[1] ?? "";
  content = before + MARKER_START + generated + MARKER_END + after;
  writeFileSync(REFERENCE_PATH, content);
}

function docSummary(decl) {
  let d = decl;
  if (typeof d.getJsDocs !== "function") {
    const sym = d.getSymbol?.();
    const alt = sym?.getDeclarations()?.[0];
    if (alt && typeof alt.getJsDocs === "function") d = alt;
    else return "—";
  }
  const jsdocs = d.getJsDocs();
  const text = jsdocs[0]?.getDescription().trim() ?? "";
  return text.replace(/\s+/gu, " ").slice(0, 240) || "—";
}

function buildReadmeApiTable(pkg) {
  const indexPath = join(REPO_ROOT, "packages", pkg.dir, "src", "index.ts");
  if (!existsSync(indexPath)) {
    return "_No `src/index.ts` — nothing to list._\n";
  }
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true },
  });
  project.addSourceFileAtPath(indexPath);
  const sf = project.getSourceFileOrThrow(indexPath);
  const rows = [];
  for (const [name, decls] of sf.getExportedDeclarations()) {
    if (name === "default") continue;
    const d = decls[0];
    if (!d) continue;
    let kind = d.getKindName();
    if (kind === "VariableDeclaration") kind = "const";
    if (kind === "FunctionDeclaration") kind = "function";
    if (kind === "InterfaceDeclaration") kind = "interface";
    if (kind === "TypeAliasDeclaration") kind = "type";
    if (kind === "ClassDeclaration") kind = "class";
    if (kind === "EnumDeclaration") kind = "enum";
    if (
      kind === "ObjectLiteralExpression" ||
      kind === "CallExpression" ||
      kind === "ArrayLiteralExpression"
    ) {
      kind = "const";
    }
    rows.push({
      name: `\`${name}\``,
      kind,
      doc: docSummary(d).replaceAll("|", "\\|"),
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  if (!rows.length) {
    return "_No named exports (or only `default`)._\n";
  }
  const lines = [
    "## Public API (generated)",
    "",
    "| Export | Kind | Description |",
    "| --- | --- | --- |",
    ...rows.map((r) => `| ${r.name} | ${r.kind} | ${r.doc} |`),
    "",
    "Regenerate with `pnpm docs:generate`.",
    "",
  ];
  return lines.join("\n");
}

function phaseReadme(packages) {
  for (const pkg of packages) {
    const readmePath = join(REPO_ROOT, "packages", pkg.dir, "README.md");
    if (!existsSync(readmePath)) continue;
    let content = readFileSync(readmePath, "utf8");
    if (!content.includes(README_START) || !content.includes(README_END)) {
      console.warn(`README ${pkg.dir}: missing readme markers, skip`);
      continue;
    }
    const table = buildReadmeApiTable(pkg);
    const before = content.split(README_START)[0];
    const after = content.split(README_END)[1] ?? "";
    content = before + README_START + "\n\n" + table + "\n" + README_END + after;
    writeFileSync(readmePath, content);
  }
}

function updateVerifiedSha() {
  if (!existsSync(REFERENCE_PATH)) return;
  const sha = execSync("git rev-parse HEAD", {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
  let content = readFileSync(REFERENCE_PATH, "utf8");
  content = content.replace(
    /(\*\*Last verified:\*\* `)[a-f0-9]+(`)/u,
    `$1${sha}$2`,
  );
  writeFileSync(REFERENCE_PATH, content);
  console.log(`Updated Last verified SHA to ${sha}`);
}

const args = process.argv.slice(2);
if (args.includes("--update-verified")) {
  updateVerifiedSha();
  process.exit(0);
}

const manifest = loadManifest();
const packages = discoverPackages(manifest);
phaseLlms(packages, manifest);
phaseReference(packages, manifest);
phaseReadme(packages);

console.log(
  `docgen: wrote llms.txt (${packages.length} packages) + root, REFERENCE markers, README API tables`,
);
