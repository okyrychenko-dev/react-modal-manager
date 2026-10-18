import { expect, userEvent, waitFor, within } from "storybook/test";
import { ScopeIsolationExample } from "./ScopeIsolationExample";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof ScopeIsolationExample> = {
  title: "Examples/Scope isolation",
  component: ScopeIsolationExample,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const SeparateRegistries: Story = {};

export const RetainedHandleInteraction: Story = {
  tags: ["!dev", "!autodocs"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scopeA = within(canvas.getByRole("region", { name: "Scope A" }));
    await userEvent.click(scopeA.getByRole("button", { name: "Open A" }));
    await expect(scopeA.getByText("Instance: modal-0")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Mount B" }));
    const scopeB = within(canvas.getByRole("region", { name: "Scope B" }));
    await userEvent.click(scopeB.getByRole("button", { name: "Open B" }));
    await expect(scopeB.getByText("Instance: modal-0")).toBeInTheDocument();
    await userEvent.click(
      scopeA.getByRole("button", { name: "Dismiss retained A handles" }),
    );
    await waitFor(() =>
      expect(scopeA.getByRole("status")).toHaveTextContent(
        "Dismissed: dismiss",
      ),
    );
    await expect(
      scopeA.queryByText("Instance: modal-0"),
    ).not.toBeInTheDocument();
    await expect(scopeB.getByRole("status")).toHaveTextContent("Pending");
    await expect(scopeB.getByText("Instance: modal-0")).toBeInTheDocument();
    await userEvent.click(scopeB.getByRole("button", { name: "Complete B" }));
    await expect(scopeB.getByRole("status")).toHaveTextContent("Completed: B");
  },
};
