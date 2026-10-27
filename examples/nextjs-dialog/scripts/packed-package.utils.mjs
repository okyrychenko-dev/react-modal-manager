import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertDefined,
  assertString,
  assertTrue,
  isObject,
} from "@okyrychenko-dev/type-utils";

// Redirect only the package under test in the disposable production fixture.
// Keep the runnable example and every external lockfile resolution intact.
export function configurePackedModalPackage(app, root) {
  const packageName = "@okyrychenko-dev/react-modal-manager";
  const manifestPath = join(app, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assertTrue(
    isObject(manifest) && isObject(manifest.dependencies),
    "Expected example dependencies",
  );
  const version = manifest.dependencies[packageName];
  assertString(version);
  const builtManifest = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  );
  assertTrue(isObject(builtManifest), "Expected built package manifest");
  assertString(builtManifest.version);
  const lockPath = join(app, "pnpm-lock.yaml");
  const lock = readFileSync(lockPath, "utf8");
  const checksum = createHash("sha512")
    .update(readFileSync(join(app, "react-modal-manager.tgz")))
    .digest("base64");
  const tarball = "file:react-modal-manager.tgz";
  const importer = `      '${packageName}':\n        specifier: ${version}\n        version: ${version}`;
  const header = `  '${packageName}@${version}':\n`;
  const snapshot = `  '${packageName}@${version}(`;
  assertTrue(
    lock.includes(importer),
    "Missing registry dependency in example lockfile",
  );
  assertTrue(
    lock.split(header).length === 2,
    "Expected one package resolution",
  );
  assertTrue(lock.split(snapshot).length === 2, "Expected one peer snapshot");
  const block = lock.split(header)[1]?.split("\n\n")[0];
  assertDefined(block);
  const resolution = /resolution: \{[^\n]+\}/gu;
  assertTrue(
    [...block.matchAll(resolution)].length === 1,
    "Expected one registry resolution",
  );
  const packedBlock = block.replace(
    resolution,
    `resolution: {integrity: sha512-${checksum}, tarball: ${tarball}}\n    version: ${builtManifest.version}`,
  );
  const packedLock = lock
    .replace(
      importer,
      `      '${packageName}':\n        specifier: file:./react-modal-manager.tgz\n        version: ${tarball}`,
    )
    .replace(header + block, `  '${packageName}@${tarball}':\n${packedBlock}`)
    .replace(snapshot, `  '${packageName}@${tarball}(`);
  manifest.dependencies[packageName] = "file:./react-modal-manager.tgz";
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(lockPath, packedLock);
}
