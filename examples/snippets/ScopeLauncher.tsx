import { ModalDismissError } from "@okyrychenko-dev/react-modal-manager";
import { isInstanceOf } from "@okyrychenko-dev/type-utils";
import { useEffect, useRef, useState } from "react";
import type { ModalHandle } from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";
import type { ScopeLauncherProps } from "./scope-isolation.types";

export function ScopeLauncher(props: ScopeLauncherProps): ReactNode {
  const { registry, scope } = props;

  const pending = useRef(new Set<ModalHandle<string>>());
  const [outcome, setOutcome] = useState("Ready");

  useEffect(() => {
    const handles = pending.current;

    return () => {
      for (const handle of handles) {
        handle.dismiss();
      }
      handles.clear();
    };
  }, []);

  function handleOpen(): void {
    const handle = registry.open("operation", scope);
    pending.current.add(handle);
    setOutcome("Pending");

    void handle
      .then((result) => {
        if (pending.current.has(handle)) {
          setOutcome(`Completed: ${result}`);
        }
      })
      .catch((error: unknown) => {
        if (isInstanceOf(error, ModalDismissError)) {
          if (pending.current.has(handle)) {
            setOutcome(`Dismissed: ${error.reason}`);
          }
        } else {
          if (pending.current.has(handle)) {
            setOutcome("Failed");
          }
          console.error(error);
        }
      })
      .finally(() => {
        pending.current.delete(handle);
      });
  }

  function handleDismiss(): void {
    for (const handle of pending.current) {
      handle.dismiss();
    }
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
