import assert from "node:assert/strict";
import { createRequire } from "node:module";

Object.defineProperty(globalThis, "crypto", { value: undefined });

const require = createRequire(import.meta.url);
const formats = [
  await import("@okyrychenko-dev/react-modal-manager"),
  require("@okyrychenko-dev/react-modal-manager"),
];

for (const { createModal } of formats) {
  const first = createModal({ component: () => null });
  const second = createModal({ component: () => null });

  assert.equal(typeof first.id, "string");
  assert.notEqual(first.id, second.id);
  assert.equal(
    createModal({ id: "explicit-consumer", component: () => null }).id,
    "explicit-consumer",
  );
}
