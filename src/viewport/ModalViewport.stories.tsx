import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ModalDismissError, useModalManager } from "../index";
import {
  StoryLayout,
  renameReportModal,
  styles,
  withImmediateModalProvider,
  withModalProvider,
} from "../stories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import type { RenameReportResult } from "../stories";

function describeRendererResult(result: RenameReportResult): string {
  if (result.status === "renamed") {
    return `Resolved: ${result.name}`;
  }

  return "Cancelled";
}

function describeRendererError(error: unknown): string {
  if (error instanceof ModalDismissError) {
    return `Dismissed: ${error.reason}`;
  }

  return "Rejected";
}

function CustomRendererDemo(): ReactElement {
  const modal = useModalManager();
  const [result, setResult] = useState(
    "Open a modal to see the renderer badge",
  );

  const applyResult = (modalResult: RenameReportResult): void => {
    setResult(describeRendererResult(modalResult));
  };

  const applyError = (error: unknown): void => {
    setResult(describeRendererError(error));
  };

  const handleOpen = (): void => {
    void modal
      .open(renameReportModal, {
        currentName: "Renderer demo",
        reportId: "renderer-demo",
      })
      .then(applyResult)
      .catch(applyError);
  };

  return (
    <StoryLayout
      description="ModalViewport maps active lifecycle instances through the renderer seam. The badge exposes instance identity and the open-to-closing transition."
      results={[{ label: "Renderer flow", value: result }]}
      title="Custom Renderer Lifecycle"
    >
      <div className={styles.buttonRow}>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleOpen}
          type="button"
        >
          Open rendered modal
        </button>
      </div>
    </StoryLayout>
  );
}

function renderCustomRenderer(): ReactElement {
  return <CustomRendererDemo />;
}

async function openRenderedModal(
  canvasElement: HTMLElement,
): Promise<HTMLElement> {
  const canvas = within(canvasElement);

  await userEvent.click(
    canvas.getByRole("button", { name: "Open rendered modal" }),
  );

  return canvas.findByRole("dialog");
}

const meta: Meta = {
  title: "Components/ModalViewport",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof meta>;

const playCustomRenderer: NonNullable<Story["play"]> = async ({
  canvasElement,
}) => {
  const canvas = within(canvasElement);
  const dialog = await openRenderedModal(canvasElement);

  await expect(dialog).toBeInTheDocument();
  await expect(canvas.getByText("modal-0 · open")).toBeInTheDocument();

  await userEvent.click(within(dialog).getByRole("button", { name: "Rename" }));

  await expect(canvas.getByText("modal-0 · closing")).toBeInTheDocument();
  await waitFor(async () => {
    await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
  });
};

const playImmediateRemoval: NonNullable<Story["play"]> = async ({
  canvasElement,
}) => {
  const canvas = within(canvasElement);
  const dialog = await openRenderedModal(canvasElement);
  await userEvent.click(
    within(dialog).getByRole("button", {
      name: "Rename",
    }),
  );

  await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
  await expect(canvas.queryByText(/ · closing$/)).not.toBeInTheDocument();
  await expect(canvas.getByText("Resolved: Renderer demo")).toBeInTheDocument();
};

export const CustomRenderer: Story = {
  decorators: [withModalProvider],
  render: renderCustomRenderer,
};

export const CustomRendererInteraction: Story = {
  decorators: [withModalProvider],
  render: renderCustomRenderer,
  tags: ["!dev", "!autodocs"],
  play: playCustomRenderer,
};

export const ImmediateRemoval: Story = {
  decorators: [withImmediateModalProvider],
  render: renderCustomRenderer,
  play: playImmediateRemoval,
};
