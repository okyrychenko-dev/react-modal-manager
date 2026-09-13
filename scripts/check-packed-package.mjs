import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repositoryRoot = new URL("../", import.meta.url);
const repositoryPath = fileURLToPath(repositoryRoot);
const temporaryRoot = mkdtempSync(
  join(tmpdir(), "react-modal-manager-package-"),
);
const tarballPath = join(temporaryRoot, "react-modal-manager.tgz");
const extractRoot = join(temporaryRoot, "extract");
const consumerRoot = join(temporaryRoot, "consumer");

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
}

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? listFiles(path)
      : [relative(join(extractRoot, "package"), path)];
  });
}

function packageRootName(specifier) {
  const segments = specifier.split("/");
  return specifier.startsWith("@")
    ? `${segments[0]}/${segments[1]}`
    : segments[0];
}

function externalPackages(contents) {
  const specifiers = [
    ...contents.matchAll(/\bfrom\s+["']([^"']+)["']/gu),
    ...contents.matchAll(/\brequire\(["']([^"']+)["']\)/gu),
  ].map((match) => packageRootName(match[1]));
  return [...new Set(specifiers)].sort();
}

try {
  run("pnpm", ["pack", "--out", tarballPath]);
  run("mkdir", ["-p", extractRoot, consumerRoot]);
  run("tar", ["-xzf", tarballPath, "-C", extractRoot]);

  const packageRoot = join(extractRoot, "package");
  const expectedFiles = [
    "LICENSE",
    "README.md",
    "dist/index.cjs",
    "dist/index.cjs.map",
    "dist/index.d.cts",
    "dist/index.d.ts",
    "dist/index.js",
    "dist/index.js.map",
    "package.json",
  ];
  const packedFiles = listFiles(packageRoot).sort();
  invariant(
    JSON.stringify(packedFiles) === JSON.stringify(expectedFiles),
    `Unexpected packed files:\n${packedFiles.join("\n")}`,
  );

  const manifest = JSON.parse(
    readFileSync(join(packageRoot, "package.json"), "utf8"),
  );
  invariant(
    manifest.sideEffects === false,
    "Published package must remain side-effect free",
  );
  invariant(
    JSON.stringify(manifest.peerDependencies) ===
      JSON.stringify({ react: "^18.0.0 || ^19.0.0" }),
    "React must be the only published peer dependency",
  );
  invariant(
    JSON.stringify(manifest.dependencies) ===
      JSON.stringify({ "@okyrychenko-dev/type-utils": "^0.1.2" }),
    "Published runtime dependencies do not match the implementation contract",
  );
  const declaredRuntimePackages = [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ].sort();
  const importedRuntimePackages = [
    ...new Set(
      ["dist/index.js", "dist/index.cjs"].flatMap((file) =>
        externalPackages(readFileSync(join(packageRoot, file), "utf8")),
      ),
    ),
  ].sort();
  invariant(
    JSON.stringify(importedRuntimePackages) ===
      JSON.stringify(declaredRuntimePackages),
    `Built imports ${JSON.stringify(importedRuntimePackages)} do not match declared runtime packages ${JSON.stringify(declaredRuntimePackages)}`,
  );
  for (const exportPath of [
    manifest.exports["."].import.types,
    manifest.exports["."].import.default,
    manifest.exports["."].require.types,
    manifest.exports["."].require.default,
  ]) {
    invariant(
      existsSync(join(packageRoot, exportPath)),
      `Missing exported file: ${exportPath}`,
    );
  }

  writeFileSync(
    join(consumerRoot, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
    }),
  );
  writeFileSync(
    join(consumerRoot, "esm.mjs"),
    'import { createModal } from "@okyrychenko-dev/react-modal-manager";\nif (typeof createModal !== "function") throw new Error("ESM export unavailable");\n',
  );
  writeFileSync(
    join(consumerRoot, "cjs.cjs"),
    'const { createModal } = require("@okyrychenko-dev/react-modal-manager");\nif (typeof createModal !== "function") throw new Error("CommonJS export unavailable");\n',
  );
  writeFileSync(
    join(consumerRoot, "bundle-entry.js"),
    'import { createModal } from "@okyrychenko-dev/react-modal-manager";\nconsole.log(typeof createModal);\n',
  );
  writeFileSync(
    join(consumerRoot, "side-effect-entry.js"),
    'const before = new Set(Reflect.ownKeys(globalThis));\nawait import("@okyrychenko-dev/react-modal-manager");\nconst added = Reflect.ownKeys(globalThis).filter((key) => !before.has(key));\nif (added.length > 0) throw new Error(`Package added globals: ${added.join(", ")}`);\n',
  );
  const typeConsumer = readFileSync(
    join(repositoryPath, "scripts/package-consumer.typecheck.ts"),
  );
  writeFileSync(join(consumerRoot, "consumer.mts"), typeConsumer);
  writeFileSync(join(consumerRoot, "consumer.cts"), typeConsumer);

  const consumerModules = join(consumerRoot, "node_modules");
  const installedPackage = join(
    consumerModules,
    "@okyrychenko-dev/react-modal-manager",
  );
  mkdirSync(join(consumerModules, "@okyrychenko-dev"), { recursive: true });
  mkdirSync(join(consumerModules, "@types"), { recursive: true });
  cpSync(packageRoot, installedPackage, { recursive: true });
  for (const packageName of [
    "@okyrychenko-dev/type-utils",
    "@types/react",
    "react",
  ]) {
    const target = join(repositoryPath, "node_modules", packageName);
    const link = join(consumerModules, packageName);
    mkdirSync(join(link, ".."), { recursive: true });
    symlinkSync(target, link, "dir");
  }
  execFileSync("node", [join(consumerRoot, "esm.mjs")], { stdio: "inherit" });
  execFileSync("node", [join(consumerRoot, "cjs.cjs")], { stdio: "inherit" });

  execFileSync(
    join(repositoryPath, "node_modules/.bin/tsc"),
    [
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--target",
      "ES2020",
      "consumer.mts",
      "consumer.cts",
    ],
    { cwd: consumerRoot, stdio: "inherit" },
  );

  const bundlePath = join(consumerRoot, "minimal-consumer.js");
  execFileSync(
    join(repositoryPath, "node_modules/.bin/esbuild"),
    [
      join(consumerRoot, "bundle-entry.js"),
      "--bundle",
      "--external:react",
      "--format=esm",
      "--minify",
      `--outfile=${bundlePath}`,
    ],
    { stdio: "inherit" },
  );
  const bundle = readFileSync(bundlePath);
  const installedManifestPath = join(installedPackage, "package.json");
  const installedManifest = JSON.parse(
    readFileSync(installedManifestPath, "utf8"),
  );
  installedManifest.sideEffects = true;
  writeFileSync(installedManifestPath, JSON.stringify(installedManifest));
  const sideEffectBundlePath = join(consumerRoot, "side-effect-check.js");
  execFileSync(
    join(repositoryPath, "node_modules/.bin/esbuild"),
    [
      join(consumerRoot, "side-effect-entry.js"),
      "--bundle",
      "--external:react",
      "--format=esm",
      "--minify",
      `--outfile=${sideEffectBundlePath}`,
    ],
    { stdio: "inherit" },
  );
  const sideEffectExecution = spawnSync("node", [sideEffectBundlePath], {
    encoding: "utf8",
    timeout: 5_000,
  });
  invariant(
    sideEffectExecution.status === 0 &&
      sideEffectExecution.stdout === "" &&
      sideEffectExecution.stderr === "",
    `Importing the package produced observable behavior despite sideEffects: false\n${sideEffectExecution.stdout}${sideEffectExecution.stderr}`,
  );

  const measuredFiles = ["dist/index.js", "dist/index.cjs", "dist/index.d.ts"];
  const measurements = Object.fromEntries(
    measuredFiles.map((file) => {
      const contents = readFileSync(join(packageRoot, file));
      return [
        file,
        {
          bytes: contents.byteLength,
          gzipBytes: gzipSync(contents).byteLength,
        },
      ];
    }),
  );
  measurements["minimal-consumer.js"] = {
    bytes: statSync(bundlePath).size,
    gzipBytes: gzipSync(bundle).byteLength,
  };

  const esbuildVersion = run("pnpm", ["exec", "esbuild", "--version"], {
    capture: true,
  }).trim();
  const pnpmVersion = run("pnpm", ["--version"], { capture: true }).trim();
  console.log(
    JSON.stringify(
      {
        measurements,
        node: process.version,
        tools: { esbuild: esbuildVersion, pnpm: pnpmVersion },
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}
