import { assertDefined, isInstanceOf } from "@okyrychenko-dev/type-utils";
import { useMemo, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ModalDismissError } from "../errors";
import { useModalManager } from "../hooks/useModalManager";
import { createModalRegistry } from "../registry";
import {
  StoryLayout,
  StoryRenderer,
  renameReportModal,
  styles,
  withModalProvider,
} from "../stories";
import { ModalProvider } from "./ModalProvider";
import { DismissRejectDemo } from "./ModalProvider.stories.fixtures";
import { RegistryRefreshDemo } from "./RegistryRefreshDemo";
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
  if (isInstanceOf(error, ModalDismissError)) {
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

    if (isInstanceOf(error, ModalDismissError)) {
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
        <section aria-label="Provider A">
          <h2>Provider A</h2>
          <ModalProvider closeDelayMs={220} renderer={StoryRenderer}>
            <TypedModalDemo />
          </ModalProvider>
        </section>
        <section aria-label="Provider B">
          <h2>Provider B</h2>
          <ModalProvider closeDelayMs={220} renderer={StoryRenderer}>
            <TypedModalDemo />
          </ModalProvider>
        </section>
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
  ...TypedCustomModal,
  tags: ["!dev", "!autodocs"],
  play: playTypedCustomModal,
};

export const DismissAndReject: Story = {
  decorators: [withModalProvider],
  render: renderDismissAndReject,
};

export const RepeatedManagerDismissInteraction: Story = {
  ...DismissAndReject,
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

export const ProviderIsolationInteraction: Story = {
  ...ProviderIsolation,
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = within(canvas.getByRole("region", { name: "Provider A" }));
    const second = within(canvas.getByRole("region", { name: "Provider B" }));
    await userEvent.click(first.getByRole("button", { name: "Rename report" }));
    const firstDialog = await first.findByRole("dialog");
    await expect(second.queryByRole("dialog")).not.toBeInTheDocument();
    await expect(second.getByText("No modal result yet")).toBeInTheDocument();
    await userEvent.click(
      second.getByRole("button", { name: "Rename report" }),
    );
    const secondDialog = await second.findByRole("dialog");
    await userEvent.click(
      within(firstDialog).getByRole("button", { name: "Rename" }),
    );
    await expect(
      await first.findByText('Renamed to "Quarterly revenue"'),
    ).toBeInTheDocument();
    await expect(secondDialog).toBeInTheDocument();
    await expect(second.getByText("No modal result yet")).toBeInTheDocument();
    await userEvent.click(
      within(secondDialog).getByRole("button", { name: "Cancel" }),
    );
    await expect(
      await second.findByText("Cancelled with typed result"),
    ).toBeInTheDocument();
  },
};

export const TypedCancellationInteraction: Story = {
  ...TypedCustomModal,
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Rename report" }),
    );
    const dialog = await canvas.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel" }),
    );
    await expect(
      await canvas.findByText("Cancelled with typed result"),
    ).toBeInTheDocument();
  },
};

export const ModalDismissInteraction: Story = {
  ...TypedCustomModal,
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Rename report" }),
    );
    const dialog = await canvas.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Dismiss" }),
    );
    await expect(
      await canvas.findByText("Dismissed: dismiss"),
    ).toBeInTheDocument();
  },
};

export const RepeatedHandleDismissInteraction: Story = {
  ...DismissAndReject,
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (let cycle = 0; cycle < 2; cycle += 1) {
      await userEvent.click(
        canvas.getByRole("button", { name: "Auto dismiss from handle" }),
      );
      await expect(await canvas.findByRole("dialog")).toBeInTheDocument();
      await waitFor(async () => {
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
      });
      await expect(canvas.getByText("Dismissed: dismiss")).toBeInTheDocument();
    }
  },
};

export const UnknownRejectionInteraction: Story = {
  ...DismissAndReject,
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Open rejecting modal" }),
    );
    const dialog = await canvas.findByRole("dialog", {
      name: "Reject with string",
    });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Reject string" }),
    );
    await expect(
      await canvas.findByText("Wrapped reject value: network unavailable"),
    ).toBeInTheDocument();
  },
};

export const StackedModalsInteraction: Story = {
  ...StackedModals,
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const count of [3, 6]) {
      await userEvent.click(canvas.getByRole("button", { name: "Open stack" }));
      const dialogs = await canvas.findAllByRole("dialog");
      await expect(dialogs).toHaveLength(3);
      for (const [index, name] of ["Revenue", "Costs", "Forecast"].entries()) {
        const dialog = dialogs[index];
        assertDefined(dialog);
        await expect(
          within(dialog).getByRole("textbox", { name: "Report name" }),
        ).toHaveValue(name);
      }
      await userEvent.click(canvas.getByRole("button", { name: "Close all" }));
      await expect(await canvas.findByText(String(count))).toBeInTheDocument();
      await expect(canvas.getByText("close-all")).toBeInTheDocument();
      await waitFor(async () => {
        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);
      });
    }
  },
};

export const ProviderBoundRegistryInteraction: Story = {
  ...ProviderBoundRegistry,
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (let cycle = 0; cycle < 2; cycle += 1) {
      await userEvent.click(
        canvas.getByRole("button", { name: "Run external command" }),
      );
      const dialog = await canvas.findByRole("dialog");
      const input = within(dialog).getByRole("textbox", {
        name: "Report name",
      });
      await expect(input).toHaveValue("Registry report");
      await userEvent.clear(input);
      await userEvent.type(input, `External result ${String(cycle)}`);
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Rename" }),
      );
      await expect(
        await canvas.findByText(
          `Renamed to "External result ${String(cycle)}"`,
        ),
      ).toBeInTheDocument();
      await waitFor(async () => {
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
      });
    }
  },
};

export const RegistryConfigurationRefresh: Story = {
  render: () => <RegistryRefreshDemo />,
};

export const RegistryConfigurationRefreshInteraction: Story = {
  ...RegistryConfigurationRefresh,
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Mount B" }));
    await userEvent.click(canvas.getByRole("button", { name: "Update A" }));
    await userEvent.click(
      canvas.getByRole("button", { name: "Open through registry" }),
    );
    const providerB = within(canvas.getByTestId("provider-b"));
    const dialogB = await providerB.findByRole("dialog", {
      name: "Routing confirmation",
    });
    await userEvent.click(
      within(dialogB).getByRole("button", { name: "Confirm" }),
    );
    await waitFor(() => expect(dialogB).not.toBeInTheDocument());
    await userEvent.click(canvas.getByRole("button", { name: "Unmount B" }));
    await userEvent.click(
      canvas.getByRole("button", { name: "Open through registry" }),
    );
    const providerA = within(canvas.getByTestId("provider-a"));
    const dialogA = await providerA.findByRole("dialog", {
      name: "Routing confirmation",
    });
    await expect(
      within(dialogA).getByText("Updated A configuration"),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialogA).getByRole("button", { name: "Finish" }),
    );
    await waitFor(() => expect(dialogA).not.toBeInTheDocument());
    await expect(canvas.getByRole("status")).toHaveTextContent("Confirmed");
  },
};
