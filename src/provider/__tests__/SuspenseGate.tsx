import { lazy } from "react";

// Keep the fallback visible until the test removes this pending lazy component.
export const SuspenseGate = lazy(() => new Promise<never>(() => undefined));
