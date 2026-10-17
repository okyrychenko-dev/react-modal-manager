import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { useModalManager } from "../hooks/useModalManager";
import {
  StoryLayout,
  styles,
  withCustomConfirmModalProvider,
  withModalProvider,
} from "../stories";
import { ConfirmStackDemo } from "./ConfirmStackDemo";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
} from "./ConfirmModal.types";

function describeConfirmResult(result: ConfirmModalResult): string {
  if (result.confirmed) {
    return "Confirmed";
  }

  return `Dismissed: ${result.reason}`;
}

function ConfirmDemo({ params }: { params: ConfirmModalParams }): ReactElement {
  const modal = useModalManager();
  const [result, setResult] = useState("No confirmation yet");

  const applyResult = (confirmResult: ConfirmModalResult): void => {
    setResult(describeConfirmResult(confirmResult));
  };

  const handleOpen = (): void => {
    void modal.confirm(params).then(applyResult);
  };

  return (
    <StoryLayout
      description="Confirm flow driven by Controls. Adjust the args to change the title, texts, variant, and dismissibility."
      results={[{ label: "Last result", value: result }]}
      title="Confirm Modal"
    >
      <div className={styles.buttonRow}>
        <button
          className={`${styles.button} ${styles.buttonDanger}`}
          onClick={handleOpen}
          type="button"
        >
          Open confirm
        </button>
      </div>
    </StoryLayout>
  );
}

function renderConfirmDemo(args: ConfirmModalParams): ReactElement {
  return <ConfirmDemo params={args} />;
}

const meta: Meta<ConfirmModalParams> = {
  title: "Components/ConfirmModal",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    cancelText: "Keep report",
    confirmText: "Delete",
    description: "This action cannot be undone.",
    dismissible: true,
    title: "Delete report?",
    variant: "danger",
  },
  argTypes: {
    dismissible: {
      control: "boolean",
    },
    variant: {
      control: "select",
      options: ["default", "danger", "warning", "success"],
    },
  },
  render: renderConfirmDemo,
};

export default meta;

type Story = StoryObj<ConfirmModalParams>;

const playBuiltInConfirm: NonNullable<Story["play"]> = async ({
  canvasElement,
}) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByRole("button", { name: "Open confirm" }));

  const dialog = await canvas.findByRole("dialog");

  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  await expect(await canvas.findByText("Confirmed")).toBeInTheDocument();
};

const playNonDismissible: NonNullable<Story["play"]> = async ({
  canvasElement,
}) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByRole("button", { name: "Open confirm" }));

  const dialog = await canvas.findByRole("dialog");

  await expect(
    within(dialog).queryByRole("button", { name: "Dismiss" }),
  ).not.toBeInTheDocument();

  await userEvent.click(
    within(dialog).getByRole("button", { name: "Keep report" }),
  );

  await expect(
    await canvas.findByText("Dismissed: cancel"),
  ).toBeInTheDocument();
};

const playCustomConfirm: NonNullable<Story["play"]> = async ({
  canvasElement,
}) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByRole("button", { name: "Open confirm" }));

  const dialog = await canvas.findByRole("dialog", { name: "Custom confirm" });

  await expect(
    within(dialog).getByText("Custom confirmation implementation"),
  ).toBeInTheDocument();
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Custom confirm" }),
  );

  await expect(await canvas.findByText("Confirmed")).toBeInTheDocument();
};

export const BuiltInConfirm: Story = { decorators: [withModalProvider] };

export const NonDismissible: Story = {
  decorators: [withModalProvider],
  args: {
    dismissible: false,
    title: "Non-dismissible confirm",
  },
};

export const CustomConfirmOverride: Story = {
  args: {
    title: "Use custom confirm?",
  },
  decorators: [withCustomConfirmModalProvider],
};

export const BuiltInConfirmInteraction: Story = {
  ...BuiltInConfirm,
  tags: ["!dev", "!autodocs"],
  play: playBuiltInConfirm,
};

export const NonDismissibleInteraction: Story = {
  ...NonDismissible,
  tags: ["!dev", "!autodocs"],
  play: playNonDismissible,
};

export const CustomConfirmOverrideInteraction: Story = {
  ...CustomConfirmOverride,
  tags: ["!dev", "!autodocs"],
  play: playCustomConfirm,
};

export const StackedFocus: Story = {
  render: () => <ConfirmStackDemo />,
};

export const StackedFocusInteraction: Story = {
  ...StackedFocus,
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const opener = canvas.getByRole("button", { name: "Open lower" });
    await userEvent.click(opener);
    await userEvent.keyboard("b");
    const upper = await canvas.findByRole("dialog", {
      name: "Upper confirmation",
    });
    const confirm = within(upper).getByRole("button", { name: "Confirm" });
    await expect(confirm).toHaveFocus();
    await userEvent.keyboard("{Delete}");
    await waitFor(() =>
      expect(
        canvas.queryByRole("dialog", { name: "Lower confirmation" }),
      ).not.toBeInTheDocument(),
    );
    await expect(confirm).toHaveFocus();
    await userEvent.tab();
    await expect(
      within(upper).getByRole("button", { name: "Dismiss" }),
    ).toHaveFocus();
    await userEvent.tab();
    await expect(
      within(upper).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(upper).not.toBeInTheDocument());
    await expect(opener).toHaveFocus();
    await expect(canvas.getByRole("status")).toHaveTextContent("dismiss");
  },
};

export const DelayedStackedFocus: Story = {
  ...StackedFocus,
  render: () => <ConfirmStackDemo closeDelayMs={150} />,
};

export const DelayedStackedFocusInteraction: Story = {
  ...DelayedStackedFocus,
  tags: ["!dev", "!autodocs"],
  play: StackedFocusInteraction.play,
};
