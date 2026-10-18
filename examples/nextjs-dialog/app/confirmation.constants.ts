import { createModal } from "@okyrychenko-dev/react-modal-manager";
import { ConfirmationContent } from "./ConfirmationContent";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
} from "@okyrychenko-dev/react-modal-manager";

export const confirmation = createModal<ConfirmModalParams, ConfirmModalResult>(
  {
    component: ConfirmationContent,
  },
);
