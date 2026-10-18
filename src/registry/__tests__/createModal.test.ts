import { afterEach, describe, expect, it, vi } from "vitest";
import { createModal } from "../createModal";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createModal definition identity", () => {
  it.each([undefined, {}])(
    "should create distinct definitions without crypto.randomUUID (%s)",
    (crypto) => {
      vi.stubGlobal("crypto", crypto);

      const first = createModal({ component: () => null });
      const second = createModal({ component: () => null });

      expect(first.id).toEqual(expect.any(String));
      expect(first.id).not.toBe(second.id);
    },
  );

  it("should preserve an explicit definition ID without crypto", () => {
    vi.stubGlobal("crypto", undefined);

    expect(createModal({ id: "customer", component: () => null }).id).toBe(
      "customer",
    );
  });
});
