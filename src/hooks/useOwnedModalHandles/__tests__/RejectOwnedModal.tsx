import type { ReactNode } from "react";
import type { ModalComponentProps } from "../../../types";

export function RejectOwnedModal({
  input,
  reject,
}: ModalComponentProps<Error, string>): ReactNode {
  return <button onClick={() => reject(input)}>Reject operation</button>;
}
