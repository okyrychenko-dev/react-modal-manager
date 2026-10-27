import {
  ModalDismissError,
  useOwnedModalHandles,
} from "@okyrychenko-dev/react-modal-manager";
import { isInstanceOf } from "@okyrychenko-dev/type-utils";
import { useState } from "react";
import type { ReactNode } from "react";
import type { ScopeLauncherProps } from "./scope-isolation.types";

export function ScopeLauncher(props: ScopeLauncherProps): ReactNode {
  const { registry, scope } = props;

  const owner = useOwnedModalHandles();
  const [outcome, setOutcome] = useState("Ready");

  function handleOpen(): void {
    const isActive = owner.captureLifetime();
    const handle = registry.open("operation", scope);
    setOutcome("Pending");

    void owner
      .track(handle)
      .then((result) => {
        if (isActive()) {
          setOutcome(`Completed: ${result}`);
        }
      })
      .catch((error: unknown) => {
        if (isInstanceOf(error, ModalDismissError)) {
          if (isActive()) {
            setOutcome(`Dismissed: ${error.reason}`);
          }
        } else {
          if (isActive()) {
            setOutcome("Failed");
          }
          console.error(error);
        }
      });
  }

  function handleDismiss(): void {
    owner.dismissAll();
  }

  return (
    <>
      <button type="button" onClick={handleOpen}>
        Open {scope}
      </button>
      <button type="button" onClick={handleDismiss}>
        Dismiss retained {scope} handles
      </button>
      <p role="status">{outcome}</p>
    </>
  );
}
