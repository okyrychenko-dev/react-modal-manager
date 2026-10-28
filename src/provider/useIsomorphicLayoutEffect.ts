import { isUndefined } from "@okyrychenko-dev/type-utils";
import { useEffect, useLayoutEffect } from "react";

// React 18 warns about layout effects during server rendering.
export const useIsomorphicLayoutEffect = isUndefined(globalThis.window)
  ? useEffect
  : useLayoutEffect;
