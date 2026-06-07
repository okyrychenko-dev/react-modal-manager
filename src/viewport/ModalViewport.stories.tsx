import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { ModalDismissError, useModalManager } from "../index";
import {
  StoryLayout,
  renameReportModal,
  styles,
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
      description="ModalViewport maps active modal instances through the renderer boundary. The demo renderer shows the runtime instance id in the top-right badge."
      results={[{ label: "Renderer flow", value: result }]}
      title="Custom Renderer Boundary"
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

const meta: Meta = {
  title: "Components/ModalViewport",
  decorators: [withModalProvider],
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

  await userEvent.click(
    canvas.getByRole("button", { name: "Open rendered modal" }),
  );

  await expect(await canvas.findByRole("dialog")).toBeInTheDocument();
  await expect(canvas.getByText(/modal-0/)).toBeInTheDocument();
};

export const CustomRenderer: Story = {
  render: renderCustomRenderer,
};

export const CustomRendererInteraction: Story = {
  render: renderCustomRenderer,
  tags: ["!dev", "!autodocs"],
  play: playCustomRenderer,
};
