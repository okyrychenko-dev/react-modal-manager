import { useMemo, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  ModalDismissError,
  ModalProvider,
  createModalRegistry,
  useModalManager,
} from "../index";
import {
  StoryLayout,
  StoryRenderer,
  renameReportModal,
  styles,
  withModalProvider,
} from "../stories";
import { DismissRejectDemo } from "./ModalProvider.stories.fixtures";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import type { RenameReportResult } from "../stories";

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

function StackedModalDemo(): ReactElement {
  const modal = useModalManager();
  const [closedCount, setClosedCount] = useState(0);
  const [dismissedCount, setDismissedCount] = useState(0);
  const [lastDismissReason, setLastDismissReason] = useState("None");

  const markResolved = (): void => {
    setClosedCount(increment);
  };

  const markDismissed = (error: unknown): void => {
    setDismissedCount(increment);

    if (error instanceof ModalDismissError) {
      setLastDismissReason(error.reason);
    }
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
        { label: "Last dismissal", value: lastDismissReason },
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

function ProviderBoundRegistryDemo(): ReactElement {
  const registry = useMemo(
    () => createModalRegistry({ renameReport: renameReportModal }),
    [],
  );
  const [result, setResult] = useState("No external command has run yet");

  const handleOpen = (): void => {
    void registry
      .open("renameReport", {
        currentName: "Registry report",
        reportId: "registry-report",
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
        description="A provider-bound registry can open typed modals from code that does not call useModalManager."
        results={[{ label: "External command", value: result }]}
        title="Provider-Bound Registry"
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
        registry={registry}
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

function renderProviderBoundRegistry(): ReactElement {
  return <ProviderBoundRegistryDemo />;
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

const playRepeatedManagerDismiss: NonNullable<Story["play"]> = async ({
  canvasElement,
}) => {
  const canvas = within(canvasElement);
  const trigger = canvas.getByRole("button", {
    name: "Auto dismiss from manager",
  });

  for (let cycle = 0; cycle < 2; cycle += 1) {
    await userEvent.click(trigger);
    await expect(await canvas.findByRole("dialog")).toBeInTheDocument();
    await waitFor(async () => {
      await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
    });
    await expect(canvas.getByText("Dismissed: dismiss")).toBeInTheDocument();
  }
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

export const RepeatedManagerDismissInteraction: Story = {
  decorators: [withModalProvider],
  render: renderDismissAndReject,
  tags: ["!dev", "!autodocs"],
  play: playRepeatedManagerDismiss,
};

export const StackedModals: Story = {
  decorators: [withModalProvider],
  render: renderStackedModals,
};

export const ProviderIsolation: Story = {
  render: renderProviderIsolation,
};

export const ProviderBoundRegistry: Story = {
  render: renderProviderBoundRegistry,
};
