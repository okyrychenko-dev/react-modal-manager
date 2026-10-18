import type { ModalComponentProps } from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

export function ScopeOperation(
  props: ModalComponentProps<string, string>,
): ReactNode {
  const { close, input, instanceId } = props;

  function handleComplete(): void {
    close(input);
  }

  return (
    <section aria-label={`Operation ${input}`}>
      <p>Instance: {instanceId}</p>
      <button type="button" onClick={handleComplete}>
        Complete {input}
      </button>
    </section>
  );
}
