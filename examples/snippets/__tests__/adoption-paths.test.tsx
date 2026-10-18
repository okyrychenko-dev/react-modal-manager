import {
  ModalProvider,
  createModalRegistry,
} from "@okyrychenko-dev/react-modal-manager";
import { assertDefined } from "@okyrychenko-dev/type-utils";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AdoptionPathsExample,
  ReportsPage,
  reportModals,
} from "../adoption-paths.typecheck";
import { ConfirmationButton } from "../ConfirmationButton";
import {
  ContextReportModal,
  ReportContext,
} from "../rendering-context.typecheck";
import type { Optional } from "@okyrychenko-dev/type-utils";

describe("adoption paths", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("should show typed confirmed and cancelled outcomes in the introductory caller", async () => {
    render(
      <ModalProvider>
        <ConfirmationButton />
      </ModalProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open confirmation" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Confirmed"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Open confirmation" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Cancelled: cancel"),
    );
  });

  it("should show expected dismissal in the introductory caller", async () => {
    const registry = createModalRegistry({});
    render(
      <ModalProvider registry={registry}>
        <ConfirmationButton />
      </ModalProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open confirmation" }));
    act(() => registry.closeAll());
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe(
        "Dismissed: close-all",
      ),
    );
  });

  it("should report failures thrown by a detached confirmation result handler", async () => {
    const failure = new Error("Storage unavailable");
    vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw failure;
    });
    const report = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<AdoptionPathsExample />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Delete report" })[0],
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Confirm",
      }),
    );

    await waitFor(() => expect(report).toHaveBeenCalledWith(failure));
  });

  it("should handle confirmation cancellation and concurrent provider teardown", async () => {
    const report = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { unmount } = render(<AdoptionPathsExample />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Delete report" })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(window.localStorage.getItem("last-delete-outcome")).toBe("cancel"),
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Rename report" })[0],
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Rename report" })[0],
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Delete report" })[0],
    );

    unmount();

    await act(async () => {
      await Promise.resolve();
    });

    expect(report).not.toHaveBeenCalled();
  });

  it("should observe successful rename and safely dismiss a confirmation handle", async () => {
    const report = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<AdoptionPathsExample />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Rename report" })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() =>
      expect(window.localStorage.getItem("report-1-name")).toBe(
        "Q3 report updated",
      ),
    );

    let handle: Optional<ReturnType<typeof reportModals.confirm>>;

    act(() => {
      handle = reportModals.confirm({ title: "External confirmation" });
    });

    assertDefined(handle);

    const rejected = expect(handle).rejects.toMatchObject({
      reason: "dismiss",
    });

    const attached = handle;

    act(() => attached.dismiss());

    await rejected;

    expect(report).not.toHaveBeenCalled();
  });

  it("should render once with ancestor context and explicit launcher input", async () => {
    const registry = createModalRegistry({ report: ContextReportModal });

    render(
      <ReportContext.Provider value="ancestor">
        <ModalProvider registry={registry}>
          <ReportContext.Provider value="launcher-only">
            <span>Launcher</span>
          </ReportContext.Provider>
        </ModalProvider>
      </ReportContext.Provider>,
    );
    let handle: Optional<ReturnType<typeof registry.open>>;

    act(() => {
      handle = registry.open("report", { reportName: "explicit input" });
    });

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog").textContent).toContain(
      "ancestor: explicit input",
    );

    assertDefined(handle);

    const rejected = expect(handle).rejects.toMatchObject({
      reason: "dismiss",
    });

    const attached = handle;

    act(() => attached.dismiss());

    await rejected;
  });

  it("should dismiss every caller-owned concurrent rename when its launcher unmounts", async () => {
    const report = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { rerender } = render(
      <ModalProvider>
        <ReportsPage />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rename report" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename report" }));

    expect(
      screen.getAllByRole("region", { name: "Rename Q3 report" }),
    ).toHaveLength(2);

    rerender(<ModalProvider>{null}</ModalProvider>);

    await waitFor(() =>
      expect(
        screen.queryAllByRole("region", { name: "Rename Q3 report" }),
      ).toHaveLength(0),
    );

    expect(report).not.toHaveBeenCalled();
  });

  it("should report errors in the rename derived chain without leaving unhandled rejections", async () => {
    const failure = new Error("Cannot save name");
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw failure;
    });
    const report = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<AdoptionPathsExample />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Rename report" })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() => expect(report).toHaveBeenCalledWith(failure));
  });
});
