import { useMemo, useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import {
  ModalDismissError,
  ModalProvider,
  ModalRejectError,
  createModalController,
  useModalManager,
} from "../index";
import {
  StoryLayout,
  StoryRenderer,
  rejectWithStringModal,
  renameReportModal,
  styles,
  withModalProvider,
} from "../stories/modalStoryKit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import type { RenameReportResult } from "../stories/modalStoryKit";

function describeRenameResult(result: RenameReportResult): string {
  if (result.status === "renamed") {
    return `Renamed to "${result.name}"`;
  }

  return "Cancelled with typed result";
}

function describeRenameError(error: unknown): string {
  if (error instanceof ModalDismissError) {
    return `Dismissed: ${error.reason}`;
  }

  return "Rejected";
}

function describeRejectionState(error: unknown): string {
  if (error instanceof ModalRejectError) {
    return `Wrapped reject value: ${String(error.value)}`;
  }

  return "Rejected with Error";
}

function increment(count: number): number {
  return count + 1;
}

function TypedModalDemo(): ReactElement {
  const modal = useModalManager();
  const [result, setResult] = useState("No modal result yet");

  const applyResult = (modalResult: RenameReportResult): void => {
    setResult(describeRenameResult(modalResult));
  };

  const applyError = (error: unknown): void => {
    setResult(describeRenameError(error));
  };

  const handleOpen = (): void => {
    void modal
      .open(renameReportModal, {
        currentName: "Quarterly revenue",
        reportId: "report-42",
      })
      .then(applyResult)
      .catch(applyError);
  };

  return (
    <StoryLayout
      description="A custom modal with typed input, typed result, instance id, close, cancel, and dismiss paths."
      results={[{ label: "Rename flow", value: result }]}
      title="Typed Custom Modal"
    >
      <div className={styles.buttonRow}>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleOpen}
          type="button"
        >
          Rename report
        </button>
      </div>
    </StoryLayout>
  );
}

function DismissRejectDemo(): ReactElement {
  const modal = useModalManager();
  const [state, setState] = useState(
    "Open a modal to inspect rejection behavior",
  );

  const applyDismissError = (error: unknown): void => {
    setState(describeRenameError(error));
  };

  const dismissFirst = (): void => {
    modal.dismiss("modal-0");
  };

  const handleDismissFromManager = (): void => {
    void modal
      .open(renameReportModal, {
        currentName: "Dismiss me",
        reportId: "report-dismiss",
      })
      .catch(applyDismissError);

    window.setTimeout(dismissFirst, 500);
  };

  const applyRejectionState = (error: unknown): void => {
    setState(describeRejectionState(error));
  };

  const handleReject = (): void => {
    void modal
      .open(rejectWithStringModal, undefined)
      .catch(applyRejectionState);
  };

  return (
    <StoryLayout
      description="Dismissal rejects with ModalDismissError. Unknown reject values are wrapped in ModalRejectError."
      results={[{ label: "Promise state", value: state }]}
      title="Dismiss And Reject"
    >
      <div className={styles.buttonRow}>
        <button
          className={styles.button}
          onClick={handleDismissFromManager}
          type="button"
        >
          Auto dismiss from manager
        </button>
        <button
          className={`${styles.button} ${styles.buttonDanger}`}
          onClick={handleReject}
          type="button"
        >
          Open rejecting modal
        </button>
      </div>
    </StoryLayout>
  );
}

function StackedModalDemo(): ReactElement {
  const modal = useModalManager();
  const [closedCount, setClosedCount] = useState(0);
  const [dismissedCount, setDismissedCount] = useState(0);

  const markResolved = (): void => {
    setClosedCount(increment);
  };

  const markDismissed = (): void => {
    setDismissedCount(increment);
  };

  const openStack = (): void => {
    for (const name of ["Revenue", "Costs", "Forecast"]) {
      void modal
        .open(renameReportModal, {
          currentName: name,
          reportId: name.toLowerCase(),
        })
        .then(markResolved)
        .catch(markDismissed);
    }
  };

  const handleCloseAll = (): void => {
    modal.closeAll();
  };

  return (
    <StoryLayout
      description="Multiple modal instances can be active together. closeAll rejects every pending modal promise."
      results={[
        { label: "Resolved", value: String(closedCount) },
        { label: "Dismissed", value: String(dismissedCount) },
      ]}
      title="Stacked Modals"
    >
      <div className={styles.buttonRow}>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={openStack}
          type="button"
        >
          Open stack
        </button>
        <button
          className={styles.button}
          onClick={handleCloseAll}
          type="button"
        >
          Close all
        </button>
      </div>
    </StoryLayout>
  );
}

function ProviderIsolationDemo(): ReactElement {
  return (
    <div className={styles.shell}>
      <div className={styles.workspace}>
        <ModalProvider closeDelayMs={220} renderer={StoryRenderer}>
          <TypedModalDemo />
        </ModalProvider>
        <ModalProvider closeDelayMs={220} renderer={StoryRenderer}>
          <TypedModalDemo />
        </ModalProvider>
      </div>
    </div>
  );
}

function ProviderBoundControllerDemo(): ReactElement {
  const controller = useMemo(() => createModalController(), []);
  const [result, setResult] = useState("No external command has run yet");

  const handleOpen = (): void => {
    void controller
      .open(renameReportModal, {
        currentName: "Controller report",
        reportId: "controller-report",
      })
      .then((modalResult) => {
        setResult(describeRenameResult(modalResult));
      })
      .catch((error: unknown) => {
        setResult(describeRenameError(error));
      });
  };

  return (
    <div className={styles.shell}>
      <StoryLayout
        description="A provider-bound controller can open typed modals from code that does not call useModalManager."
        results={[{ label: "External command", value: result }]}
        title="Provider-Bound Controller"
      >
        <div className={styles.buttonRow}>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleOpen}
            type="button"
          >
            Run external command
          </button>
        </div>
      </StoryLayout>
      <ModalProvider
        closeDelayMs={220}
        controller={controller}
        renderer={StoryRenderer}
      >
        {null}
      </ModalProvider>
    </div>
  );
}

function renderTypedModal(): ReactElement {
  return <TypedModalDemo />;
}

function renderDismissAndReject(): ReactElement {
  return <DismissRejectDemo />;
}

function renderStackedModals(): ReactElement {
  return <StackedModalDemo />;
}

function renderProviderIsolation(): ReactElement {
  return <ProviderIsolationDemo />;
}

function renderProviderBoundController(): ReactElement {
  return <ProviderBoundControllerDemo />;
}

const meta: Meta = {
  title: "Context/ModalProvider",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof meta>;

const playTypedCustomModal: NonNullable<Story["play"]> = async ({
  canvasElement,
}) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByRole("button", { name: "Rename report" }));

  const dialog = await canvas.findByRole("dialog");

  await userEvent.click(within(dialog).getByRole("button", { name: "Rename" }));

  await expect(
    await canvas.findByText('Renamed to "Quarterly revenue"'),
  ).toBeInTheDocument();
};

export const TypedCustomModal: Story = {
  decorators: [withModalProvider],
  render: renderTypedModal,
};

export const TypedCustomModalInteraction: Story = {
  decorators: [withModalProvider],
  render: renderTypedModal,
  tags: ["!dev", "!autodocs"],
  play: playTypedCustomModal,
};

export const DismissAndReject: Story = {
  decorators: [withModalProvider],
  render: renderDismissAndReject,
};

export const StackedModals: Story = {
  decorators: [withModalProvider],
  render: renderStackedModals,
};

export const ProviderIsolation: Story = {
  render: renderProviderIsolation,
};

export const ProviderBoundController: Story = {
  render: renderProviderBoundController,
};
