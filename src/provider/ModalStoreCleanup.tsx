import { useEffect } from "react";
import { useModalStoreApi } from "../store";
import { PROVIDER_UNMOUNT_DISMISS_REASON } from "./ModalStoreCleanup.constants";

export function ModalStoreCleanup(): null {
  const store = useModalStoreApi();

  useEffect(
    () => () => {
      store.getState().dismissAll(PROVIDER_UNMOUNT_DISMISS_REASON);
      store.getState().clearRemoveTimers();
      store.getState().clearModals();
    },
    [store],
  );

  return null;
}
