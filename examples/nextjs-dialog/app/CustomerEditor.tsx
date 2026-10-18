"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import type { ModalComponentProps } from "@okyrychenko-dev/react-modal-manager";
import type { Nullable } from "@okyrychenko-dev/type-utils";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import type { Customer } from "./customerFlow.types";

export function CustomerEditor(
  props: ModalComponentProps<Customer, Nullable<Customer>>,
): ReactNode {
  const { input, close } = props;
  const [name, setName] = useState(input.name);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    close({ ...input, name: name.trim() });
  }

  function handleNameChange(event: ChangeEvent<HTMLInputElement>): void {
    setName(event.target.value);
  }

  function handleCancel(): void {
    close(null);
  }

  return (
    <>
      <Dialog.Title>Edit customer</Dialog.Title>
      <Dialog.Description>
        Changes apply only after confirmation.
      </Dialog.Description>
      <form onSubmit={handleSubmit}>
        <label>
          Customer name
          <input value={name} onChange={handleNameChange} />
        </label>
        <div className="actions">
          <button type="button" onClick={handleCancel}>
            Cancel editing
          </button>
          <button disabled={!name.trim()}>Review changes</button>
        </div>
      </form>
    </>
  );
}
