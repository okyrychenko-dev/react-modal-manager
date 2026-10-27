"use client";

import { isDefined } from "@okyrychenko-dev/type-utils";
import { useEffect, useMemo, useRef } from "react";
import type { Optional } from "@okyrychenko-dev/type-utils";
import type { ModalHandle } from "../useModalManager";
import type { OwnedModalHandles } from "./useOwnedModalHandles.types";

export function useOwnedModalHandles(): OwnedModalHandles {
  const pending = useRef(new Set<ModalHandle<unknown>>());
  const lifetime = useRef<Optional<symbol>>(undefined);

  const owner = useMemo<OwnedModalHandles>(() => {
    async function track<TResult>(
      handle: ModalHandle<TResult>,
    ): Promise<TResult> {
      pending.current.add(handle);

      try {
        if (!isDefined(lifetime.current)) {
          handle.dismiss();
        }

        return await handle;
      } finally {
        pending.current.delete(handle);
      }
    }

    function dismissAll(): void {
      for (const handle of pending.current) {
        handle.dismiss();
      }
    }

    function captureLifetime(): () => boolean {
      const current = lifetime.current;

      return () => isDefined(current) && current === lifetime.current;
    }

    return { track, dismissAll, captureLifetime };
  }, []);

  useEffect(() => {
    lifetime.current = Symbol("launcher-lifetime");
    const handles = pending.current;

    return () => {
      lifetime.current = undefined;
      owner.dismissAll();
      handles.clear();
    };
  }, [owner]);

  return owner;
}
