import type { ReactNode } from "react";

const pending = new Promise<never>(() => undefined);

export function SuspenseGate({ suspend }: { suspend: boolean }): ReactNode {
  if (suspend) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Suspense uses thrown promises.
    throw pending;
  }
  return null;
}
