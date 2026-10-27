import {
  ModalProvider,
  createModal,
  createModalRegistry,
} from "@okyrychenko-dev/react-modal-manager";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { ConfirmationContent } from "../../nextjs-dialog/app/ConfirmationContent";
import { CustomerFlowLauncher } from "../../nextjs-dialog/app/CustomerFlowLauncher";
import { CustomerFlowRenderer } from "../../nextjs-dialog/app/CustomerFlowRenderer";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
} from "@okyrychenko-dev/react-modal-manager";

describe("customer flow ownership", () => {
  it.each(["selection", "editing", "confirmation"])(
    "should dismiss only owned work when the launcher unmounts during %s and allow a fresh run",
    async (step) => {
      const registry = createModalRegistry({
        confirmation: createModal<ConfirmModalParams, ConfirmModalResult>({
          component: ConfirmationContent,
        }),
      });
      const launcher = (
        <StrictMode>
          <ModalProvider registry={registry} renderer={CustomerFlowRenderer}>
            <CustomerFlowLauncher onUnmount={() => undefined} />
          </ModalProvider>
        </StrictMode>
      );
      const { rerender } = render(launcher);

      fireEvent.click(
        screen.getByRole("button", { name: "Start customer flow" }),
      );

      if (step !== "selection") {
        fireEvent.click(
          screen.getByRole("button", { name: "Select Ada Lovelace" }),
        );
        await screen.findByLabelText("Customer name");
      }

      if (step === "confirmation") {
        fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
        await screen.findByRole("dialog", { name: "Save Ada Lovelace?" });
      }

      let neighborResult: Promise<unknown> = Promise.resolve();

      act(() => {
        const neighbor = registry.open("confirmation", {
          title: "Unrelated work",
        });
        neighborResult = neighbor.catch((error: unknown) => error);
      });

      rerender(
        <StrictMode>
          <ModalProvider registry={registry} renderer={CustomerFlowRenderer}>
            {null}
          </ModalProvider>
        </StrictMode>,
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      expect(
        screen.getByRole("dialog", { name: "Unrelated work" }),
      ).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      await neighborResult;

      rerender(launcher);

      expect(screen.getByTestId("flow-outcome").textContent).toBe(
        "No customer saved",
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Start customer flow" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Select Grace Hopper" }),
      );

      await screen.findByLabelText("Customer name");

      fireEvent.click(screen.getByRole("button", { name: "Review changes" }));

      await screen.findByRole("dialog", { name: "Save Grace Hopper?" });

      fireEvent.click(screen.getByRole("button", { name: "Save customer" }));

      await waitFor(() =>
        expect(screen.getByTestId("flow-outcome").textContent).toBe(
          "Saved: Grace Hopper",
        ),
      );
      expect(screen.queryAllByRole("dialog")).toHaveLength(0);
    },
  );

  it("should not open editing when selection settles immediately before launcher teardown", async () => {
    const { rerender } = render(
      <ModalProvider renderer={CustomerFlowRenderer}>
        <CustomerFlowLauncher onUnmount={() => undefined} />
      </ModalProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Start customer flow" }),
    );

    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: "Select Ada Lovelace" }),
      );
      rerender(
        <ModalProvider renderer={CustomerFlowRenderer}>{null}</ModalProvider>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryAllByRole("dialog")).toHaveLength(0);
  });
});
