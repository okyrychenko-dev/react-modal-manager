import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const competitor = "@ebay/nice-modal-react@1.2.13";
const repositoryPath = fileURLToPath(new URL("../", import.meta.url));
const temporaryRoot = mkdtempSync(join(tmpdir(), "nice-modal-comparison-"));
const extractRoot = join(temporaryRoot, "extract");
const consumerRoot = join(temporaryRoot, "consumer");

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? repositoryPath,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
}

try {
  mkdirSync(extractRoot);
  mkdirSync(consumerRoot);

  const packResult = JSON.parse(
    run(
      "npm",
      ["pack", competitor, "--json", "--pack-destination", temporaryRoot],
      { capture: true },
    ),
  );
  const packed = packResult[0];

  if (!packed) {
    throw new Error(`npm pack did not return metadata for ${competitor}`);
  }

  const tarballPath = join(temporaryRoot, packed.filename);
  run("tar", ["-xzf", tarballPath, "-C", extractRoot]);

  const installedPackage = join(
    consumerRoot,
    "node_modules/@ebay/nice-modal-react",
  );
  mkdirSync(dirname(installedPackage), { recursive: true });
  symlinkSync(join(extractRoot, "package"), installedPackage, "dir");

  const entryPath = join(consumerRoot, "entry.js");
  const bundlePath = join(consumerRoot, "minimal-consumer.js");
  writeFileSync(
    entryPath,
    'import { show } from "@ebay/nice-modal-react";\nexport { show };\n',
  );
  run(
    join(repositoryPath, "node_modules/.bin/esbuild"),
    [
      entryPath,
      "--bundle",
      "--external:react",
      "--external:react-dom",
      "--format=esm",
      "--minify",
      `--outfile=${bundlePath}`,
    ],
    { cwd: consumerRoot },
  );

  const bundle = readFileSync(bundlePath);
  console.log(
    JSON.stringify(
      {
        competitor,
        tarball: {
          bytes: statSync(tarballPath).size,
          unpackedBytes: packed.unpackedSize,
        },
        "minimal-consumer.js": {
          bytes: bundle.byteLength,
          gzipBytes: gzipSync(bundle).byteLength,
        },
        tools: {
          esbuild: "0.27.7",
          npm: run("npm", ["--version"], { capture: true }).trim(),
        },
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}
