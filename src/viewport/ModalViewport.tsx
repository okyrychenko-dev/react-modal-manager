import { useModals } from "../store";
import type { ReactNode } from "react";
import type {
  ModalRendererProps,
  ModalViewportProps,
} from "./ModalViewport.types";

function DefaultModalRenderer({ children }: ModalRendererProps): ReactNode {
  return <>{children}</>;
}

export function ModalViewport({
  renderer: Renderer = DefaultModalRenderer,
}: ModalViewportProps): ReactNode {
  const modals = useModals();

  return (
    <>
      {modals.map((modal) => (
        <Renderer
          key={modal.instanceId}
          modal={{
            definitionId: modal.definitionId,
            instanceId: modal.instanceId,
            status: modal.status,
          }}
        >
          {modal.render()}
        </Renderer>
      ))}
    </>
  );
}
