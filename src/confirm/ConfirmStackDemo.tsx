import { isInstanceOf } from "@okyrychenko-dev/type-utils";
import { useMemo, useRef, useState } from "react";
import { ModalDismissError } from "../errors";
import { ModalProvider } from "../provider";
import { createModalRegistry } from "../registry";
import type { Optional } from "@okyrychenko-dev/type-utils";
import type { KeyboardEvent, ReactElement } from "react";
import type { ModalHandle } from "../hooks";
import type { ConfirmModalResult } from "./ConfirmModal.types";

export function ConfirmStackDemo({
  closeDelayMs = 0,
}: {
  closeDelayMs?: number;
}): ReactElement {
  const modal = useMemo(() => createModalRegistry({}), []);
  const lower = useRef<Optional<ModalHandle<ConfirmModalResult>>>(undefined);
  const [outcome, setOutcome] = useState("Ready");
  const observe = (handle: ModalHandle<ConfirmModalResult>): void => {
    void handle
      .then((result) => {
        setOutcome(result.confirmed ? "Confirmed" : result.reason);
      })
      .catch((error: unknown) => {
        setOutcome(
          isInstanceOf(error, ModalDismissError)
            ? "Removed lower"
            : "Unexpected rejection",
        );
        if (!isInstanceOf(error, ModalDismissError)) {
          console.error(error);
        }
      });
  };
  const openLower = (): void => {
    lower.current = modal.confirm({ title: "Lower confirmation" });
    observe(lower.current);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "b") {
      observe(modal.confirm({ title: "Upper confirmation" }));
    }
    if (event.key === "Delete") {
      lower.current?.dismiss();
    }
  };
  return (
    <div onKeyDown={handleKeyDown}>
      <ModalProvider registry={modal} closeDelayMs={closeDelayMs}>
        <p>
          Open lower, press B inside it to open upper, then Delete to remove
          lower. Escape closes upper.
        </p>
        <button type="button" onClick={openLower}>
          Open lower
        </button>
        <p role="status">{outcome}</p>
      </ModalProvider>
    </div>
  );
}
