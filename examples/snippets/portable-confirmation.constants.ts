import { createModal } from "@okyrychenko-dev/react-modal-manager";
import { PortableConfirmationContent } from "./PortableConfirmationContent";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
} from "@okyrychenko-dev/react-modal-manager";

export const portableConfirmation = createModal<
  ConfirmModalParams,
  ConfirmModalResult
>({
  component: PortableConfirmationContent,
});
