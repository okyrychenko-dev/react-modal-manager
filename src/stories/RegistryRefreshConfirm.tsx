import { useId } from "react";
import type { ReactElement } from "react";
import type { ConfirmModalParams, ConfirmModalResult } from "../confirm";
import type { ModalComponentProps } from "../types";

export function RegistryRefreshConfirm({
  input,
  close,
}: ModalComponentProps<ConfirmModalParams, ConfirmModalResult>): ReactElement {
  const titleId = useId();
  return (
    <section role="dialog" aria-labelledby={titleId}>
      <h2 id={titleId}>{input.title}</h2>
      <p>{input.description}</p>
      <button
        type="button"
        onClick={() => {
          close({ confirmed: true });
        }}
      >
        Finish
      </button>
    </section>
  );
}
