import { useState } from "react";
import { ModalProvider, createModal } from "../index";
import styles from "./modalStoryKit.module.css";
import type { Decorator } from "@storybook/react-vite";
import type { ChangeEvent, ReactElement, ReactNode } from "react";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
  ModalComponentProps,
  ModalDefinition,
  ModalRendererProps,
} from "../index";

export interface RenameReportInput {
  currentName: string;
  reportId: string;
}

interface RenameReportCanceledResult {
  status: "cancelled";
}

interface RenameReportRenamedResult {
  status: "renamed";
  name: string;
}

export type RenameReportResult =
  | RenameReportCanceledResult
  | RenameReportRenamedResult;

export interface ResultState {
  label: string;
  value: string;
}

export { styles };

interface StoryLayoutProps {
  children: ReactNode;
  description: string;
  results: Array<ResultState>;
  title: string;
}

export function StoryLayout(props: StoryLayoutProps): ReactElement {
  const { children, description, results, title } = props;

  return (
    <div className={styles.shell}>
      <div className={styles.workspace}>
        <main className={`${styles.panel} ${styles.mainPanel}`}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
          {children}
        </main>
        <aside className={`${styles.panel} ${styles.sidePanel}`}>
          <h2 className={styles.modalTitle}>Flow state</h2>
          <div className={styles.statusList}>
            {results.map((result) => (
              <div className={styles.statusItem} key={result.label}>
                <span className={styles.statusLabel}>{result.label}</span>
                <span className={styles.statusValue}>{result.value}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function StoryRenderer(props: ModalRendererProps): ReactElement {
  const { children, modal } = props;

  return (
    <div className={styles.rendererFrame}>
      <span className={styles.rendererBadge}>
        {modal.instanceId} · {modal.status}
      </span>
      <div
        className={`${styles.backdrop} ${
          modal.status === "closing" ? styles.backdropClosing : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function RenameReportModal(
  props: ModalComponentProps<RenameReportInput, RenameReportResult>,
): ReactElement {
  const { close, dismiss, input, instanceId } = props;

  const [name, setName] = useState(input.currentName);

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setName(event.target.value);
  };

  const handleDismiss = (): void => {
    dismiss();
  };

  const handleCancel = (): void => {
    close({ status: "cancelled" });
  };

  const handleRename = (): void => {
    close({ name, status: "renamed" });
  };

  return (
    <section aria-label="Rename report" className={styles.modal} role="dialog">
      <h2 className={styles.modalTitle}>Rename report</h2>
      <p className={styles.modalText}>
        Editing {input.reportId}. Instance: {instanceId}
      </p>
      <label className={styles.field}>
        <span className={styles.label}>Report name</span>
        <input
          className={styles.input}
          onChange={handleNameChange}
          value={name}
        />
      </label>
      <div className={styles.modalActions}>
        <button
          className={`${styles.button} ${styles.buttonMuted}`}
          onClick={handleDismiss}
          type="button"
        >
          Dismiss
        </button>
        <button className={styles.button} onClick={handleCancel} type="button">
          Cancel
        </button>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleRename}
          type="button"
        >
          Rename
        </button>
      </div>
    </section>
  );
}

export const renameReportModal = createModal<
  RenameReportInput,
  RenameReportResult
>({ id: "rename-report", component: RenameReportModal });

function RejectWithStringModal(
  props: ModalComponentProps<undefined, never>,
): ReactElement {
  const { reject } = props;

  const handleReject = (): void => {
    reject("network unavailable");
  };

  return (
    <section
      aria-label="Reject with string"
      className={styles.modal}
      role="dialog"
    >
      <h2 className={styles.modalTitle}>Reject with non-Error</h2>
      <p className={styles.modalText}>
        This demonstrates `ModalRejectError` wrapping for unknown rejection
        values.
      </p>
      <div className={styles.modalActions}>
        <button
          className={`${styles.button} ${styles.buttonDanger}`}
          onClick={handleReject}
          type="button"
        >
          Reject string
        </button>
      </div>
    </section>
  );
}

export const rejectWithStringModal = createModal<undefined, never>({
  id: "reject-string",
  component: RejectWithStringModal,
});

function CustomConfirmModal(
  props: ModalComponentProps<ConfirmModalParams, ConfirmModalResult>,
): ReactElement {
  const { close, input } = props;

  const handleCancel = (): void => {
    close({ confirmed: false, reason: "cancel" });
  };

  const handleConfirm = (): void => {
    close({ confirmed: true });
  };

  return (
    <section aria-label="Custom confirm" className={styles.modal} role="dialog">
      <h2 className={styles.modalTitle}>{input.title}</h2>
      {input.description !== undefined && (
        <p className={styles.modalText}>{input.description}</p>
      )}
      <div className={styles.modalActions}>
        <button className={styles.button} onClick={handleCancel} type="button">
          Custom cancel
        </button>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleConfirm}
          type="button"
        >
          Custom confirm
        </button>
      </div>
    </section>
  );
}

export const customConfirmModal = createModal<
  ConfirmModalParams,
  ConfirmModalResult
>({ id: "custom-confirm", component: CustomConfirmModal });

export const withModalProvider: Decorator = (Story, context) => {
  const { confirmModal } = context.parameters as {
    confirmModal?: ModalDefinition<ConfirmModalParams, ConfirmModalResult>;
  };

  return (
    <ModalProvider
      closeDelayMs={220}
      confirmModal={confirmModal}
      renderer={StoryRenderer}
    >
      <Story />
    </ModalProvider>
  );
};
