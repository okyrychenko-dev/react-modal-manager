import { isInstanceOf } from "@okyrychenko-dev/type-utils";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ModalDismissError } from "../errors";
import { useModalManager } from "../hooks/useModalManager";
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
  if (isInstanceOf(error, ModalDismissError)) {
    return `Dismissed: ${error.reason}`;
  }

  return "Rejected";
}

interface CustomRendererDemoProps {
  title: string;
  description: string;
}

function CustomRendererDemo({
  title,
  description,
}: CustomRendererDemoProps): ReactElement {
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
      description={description}
      results={[{ label: "Renderer flow", value: result }]}
      title={title}
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
  return (
    <CustomRendererDemo
      title="Custom Renderer Lifecycle"
      description="ModalViewport maps active lifecycle instances through the renderer seam. The badge exposes instance identity and the open-to-closing transition."
    />
  );
}

function renderImmediateRemoval(): ReactElement {
  return (
    <CustomRendererDemo
      title="Immediate Removal"
      description="A zero or negative close delay removes a settled modal immediately, without an observable closing render. Open and rename the modal to see its result, then repeat."
    />
  );
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
  await expect(
    canvas.getByRole("heading", { name: "Immediate Removal" }),
  ).toBeInTheDocument();
  const dialog = await openRenderedModal(canvasElement);
  await expect(dialog).toBeInTheDocument();
  await expect(canvas.getByText(/ · open$/)).toBeInTheDocument();
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
  ...CustomRenderer,
  tags: ["!dev", "!autodocs"],
  play: playCustomRenderer,
};

export const ImmediateRemoval: Story = {
  decorators: [withImmediateModalProvider],
  render: renderImmediateRemoval,
};

export const ImmediateRemovalInteraction: Story = {
  ...ImmediateRemoval,
  tags: ["!dev", "!autodocs"],
  play: async (context) => {
    await playImmediateRemoval(context);
    await playImmediateRemoval(context);
  },
};
