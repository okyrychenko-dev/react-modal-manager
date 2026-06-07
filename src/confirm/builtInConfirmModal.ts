import { createModal } from "../registry";
import { ConfirmModal } from "./ConfirmModal";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
} from "./ConfirmModal.types";

export const confirmModal = createModal<ConfirmModalParams, ConfirmModalResult>(
  {
    id: "confirm",
    component: ConfirmModal,
  },
);
