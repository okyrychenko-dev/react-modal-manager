import { MODAL_CONTROLLER_UNBOUND_ERROR } from "./createModalController.constants";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
  ModalController,
  ModalDefinition,
  ModalDismissReason,
  ModalHandle,
  ModalInstanceId,
  ModalManager,
} from "./types";

/**
 * Creates a modal controller for opening modals from non-React code.
 *
 * The controller maintains a stack of ModalManager instances, each from a ModalProvider.
 * When multiple providers bind the same controller simultaneously, the most recently mounted
 * provider becomes the active target ("last-bind-wins"). When that provider unmounts,
 * the controller reverts to the previous provider in the stack.
 *
 * @limitation Do not share one controller between multiple ModalProvider instances mounted
 * simultaneously in different subtrees. Create a separate controller for each provider,
 * or use one controller within a single provider tree. This matches the behavior of nice-modal-react.
 *
 * @throws {Error} If called before any provider is bound (use isReady() to check)
 *
 * @example
 * // Create once at module level
 * export const appModalController = createModalController();
 *
 * // Bind to a single provider
 * function App() {
 *   return (
 *     <ModalProvider controller={appModalController}>
 *       <ReportsPage />
 *     </ModalProvider>
 *   );
 * }
 *
 * // Now safe to call from non-React code
 * appModalController.open(reportModal, { id: "123" });
 */
export function createModalController(): ModalController {
  // Stack of managers (not singleton) — allows one controller to be bound to multiple
  // ModalProviders sequentially. The most-recently-mounted provider is active (last-bind-wins).
  // When unmounted, the controller falls back to the previous provider.
  const managerStack: Array<ModalManager> = [];

  const getActiveManager = (): ModalManager => {
    if (managerStack.length === 0) {
      throw new Error(MODAL_CONTROLLER_UNBOUND_ERROR);
    }

    return managerStack[managerStack.length - 1];
  };

  return {
    bind: (manager) => {
      managerStack.push(manager);

      return () => {
        const managerIndex = managerStack.lastIndexOf(manager);

        if (managerIndex >= 0) {
          managerStack.splice(managerIndex, 1);
        }
      };
    },

    closeAll: (reason?: ModalDismissReason) => {
      getActiveManager().closeAll(reason);
    },

    confirm: (params: ConfirmModalParams): Promise<ConfirmModalResult> =>
      getActiveManager().confirm(params),

    dismiss: (
      instanceId: ModalInstanceId,
      reason?: ModalDismissReason,
    ): void => {
      getActiveManager().dismiss(instanceId, reason);
    },

    isReady: () => managerStack.length > 0,

    open: <TInput, TResult>(
      modal: ModalDefinition<TInput, TResult>,
      input: TInput,
    ): ModalHandle<TResult> => getActiveManager().open(modal, input),
  };
}
