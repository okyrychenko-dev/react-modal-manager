"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ModalComponentProps } from "@okyrychenko-dev/react-modal-manager";
import type { Nullable } from "@okyrychenko-dev/type-utils";
import type { ReactNode } from "react";
import type { Customer } from "./customerFlow.types";

export function CustomerSelection(
  props: ModalComponentProps<Array<Customer>, Nullable<Customer>>,
): ReactNode {
  const { input, close } = props;

  function handleCancel(): void {
    close(null);
  }

  return (
    <>
      <Dialog.Title>Select customer</Dialog.Title>
      <Dialog.Description>Choose a local customer to edit.</Dialog.Description>
      <div className="actions">
        {input.map((customer) => {
          function handleSelect(): void {
            close(customer);
          }

          return (
            <button key={customer.id} onClick={handleSelect}>
              Select {customer.name}
            </button>
          );
        })}
        <button onClick={handleCancel}>Cancel selection</button>
      </div>
    </>
  );
}
