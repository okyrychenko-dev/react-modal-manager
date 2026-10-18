"use client";

import {
  ModalDismissError,
  useModalManager,
} from "@okyrychenko-dev/react-modal-manager";
import { isInstanceOf } from "@okyrychenko-dev/type-utils";
import { useState } from "react";
import type { ReactNode } from "react";

export function ConfirmationButton(): ReactNode {
  const modal = useModalManager();
  const [outcome, setOutcome] = useState("Ready");

  async function handleClick(): Promise<void> {
    try {
      const result = await modal.confirm({
        title: "Delete report?",
        description: "This demo does not change your data.",
      });
      setOutcome(
        result.confirmed ? "Confirmed" : `Cancelled: ${result.reason}`,
      );
    } catch (error: unknown) {
      if (isInstanceOf(error, ModalDismissError)) {
        setOutcome(`Dismissed: ${error.reason}`);
      } else {
        setOutcome("Failed");
        console.error(error);
      }
    }
  }

  return (
    <>
      <button onClick={() => void handleClick()}>Open confirmation</button>
      <p role="status">{outcome}</p>
    </>
  );
}
