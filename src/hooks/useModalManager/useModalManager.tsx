import { useCallback, useMemo } from "react";
import { useModalLifecycle } from "../../lifecycle";
import { useModalRuntimeConfig } from "../useModalRuntimeConfig";
import type { ModalManager } from "./useModalManager.types";

export function useModalManager(): ModalManager {
  const lifecycle = useModalLifecycle();
  const { confirmModal } = useModalRuntimeConfig();

  const confirm = useCallback<ModalManager["confirm"]>(
    (params) => lifecycle.open(confirmModal, params),
    [confirmModal, lifecycle],
  );

  return useMemo(
    () => ({
      closeAll: lifecycle.closeAll,
      confirm,
      dismiss: lifecycle.dismiss,
      open: lifecycle.open,
    }),
    [confirm, lifecycle],
  );
}
