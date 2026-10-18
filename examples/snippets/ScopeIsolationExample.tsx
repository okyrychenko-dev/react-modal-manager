"use client";

import {
  ModalProvider,
  createModalRegistry,
} from "@okyrychenko-dev/react-modal-manager";
import { useState } from "react";
import { scopeOperation } from "./scope-isolation.constants";
import { ScopeLauncher } from "./ScopeLauncher";
import type { ReactNode } from "react";

export function ScopeIsolationExample(): ReactNode {
  const [registryA] = useState(() =>
    createModalRegistry({ operation: scopeOperation }),
  );
  const [registryB] = useState(() =>
    createModalRegistry({ operation: scopeOperation }),
  );
  const [mountedB, setMountedB] = useState(false);
  const [launcherA, setLauncherA] = useState(true);

  function handleToggleProviderB(): void {
    setMountedB((mounted) => !mounted);
  }

  function handleToggleLauncherA(): void {
    setLauncherA((mounted) => !mounted);
  }

  return (
    <div>
      <h2>Separate registries and retained handles</h2>
      <p>
        This lifecycle-only example has no dialog shell or focus containment.
        Use the Radix application for complete dialog presentation.
      </p>
      <button type="button" onClick={handleToggleProviderB}>
        {mountedB ? "Unmount B" : "Mount B"}
      </button>
      <button type="button" onClick={handleToggleLauncherA}>
        {launcherA ? "Unmount A launcher" : "Mount A launcher"}
      </button>
      <section aria-label="Scope A">
        <h3>Scope A</h3>
        <ModalProvider registry={registryA}>
          {launcherA && <ScopeLauncher registry={registryA} scope="A" />}
        </ModalProvider>
      </section>
      {mountedB && (
        <section aria-label="Scope B">
          <h3>Scope B</h3>
          <ModalProvider registry={registryB}>
            <ScopeLauncher registry={registryB} scope="B" />
          </ModalProvider>
        </section>
      )}
    </div>
  );
}
