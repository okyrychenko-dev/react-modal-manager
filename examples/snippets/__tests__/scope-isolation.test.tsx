import {
  ModalProvider,
  createModalRegistry,
} from "@okyrychenko-dev/react-modal-manager";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Activity, StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { scopeOperation } from "../scope-isolation.constants";
import { ScopeIsolationExample } from "../ScopeIsolationExample";
import { ScopeLauncher } from "../ScopeLauncher";

describe("scope-owned cancellation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("should dismiss A's retained handle after B mounts without affecting B's overlapping instance", async () => {
    render(<ScopeIsolationExample />);

    const scopeA = within(screen.getByRole("region", { name: "Scope A" }));

    fireEvent.click(scopeA.getByRole("button", { name: "Open A" }));

    expect(scopeA.getByText("Instance: modal-0")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Mount B" }));

    const scopeB = within(screen.getByRole("region", { name: "Scope B" }));

    fireEvent.click(scopeB.getByRole("button", { name: "Open B" }));

    expect(scopeB.getByText("Instance: modal-0")).toBeDefined();

    fireEvent.click(
      scopeA.getByRole("button", { name: "Dismiss retained A handles" }),
    );

    await waitFor(() =>
      expect(scopeA.getByRole("status").textContent).toBe("Dismissed: dismiss"),
    );

    expect(scopeA.queryByText("Instance: modal-0")).toBeNull();
    expect(scopeB.getByRole("status").textContent).toBe("Pending");
    expect(scopeB.getByText("Instance: modal-0")).toBeDefined();

    fireEvent.click(scopeB.getByRole("button", { name: "Complete B" }));

    await waitFor(() =>
      expect(scopeB.getByRole("status").textContent).toBe("Completed: B"),
    );
  });

  it("should clean up concurrent A operations when only its launcher unmounts and allow reopening", async () => {
    const report = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <StrictMode>
        <ScopeIsolationExample />
      </StrictMode>,
    );
    const scopeA = within(screen.getByRole("region", { name: "Scope A" }));

    fireEvent.click(scopeA.getByRole("button", { name: "Open A" }));
    fireEvent.click(scopeA.getByRole("button", { name: "Open A" }));

    expect(scopeA.getAllByRole("region", { name: "Operation A" })).toHaveLength(
      2,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mount B" }));

    const scopeB = within(screen.getByRole("region", { name: "Scope B" }));

    fireEvent.click(scopeB.getByRole("button", { name: "Open B" }));
    fireEvent.click(screen.getByRole("button", { name: "Unmount A launcher" }));

    await waitFor(() =>
      expect(
        scopeA.queryAllByRole("region", { name: "Operation A" }),
      ).toHaveLength(0),
    );
    expect(scopeB.getByRole("region", { name: "Operation B" })).toBeDefined();
    expect(scopeB.getByRole("status").textContent).toBe("Pending");

    fireEvent.click(screen.getByRole("button", { name: "Mount A launcher" }));
    fireEvent.click(scopeA.getByRole("button", { name: "Open A" }));
    fireEvent.click(scopeA.getByRole("button", { name: "Complete A" }));

    await waitFor(() =>
      expect(scopeA.getByRole("status").textContent).toBe("Completed: A"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Unmount B" }));

    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Scope B" })).toBeNull(),
    );
    expect(report).not.toHaveBeenCalled();
  });

  it("should keep a completed result while cancelling later concurrent work and reopening after teardown", async () => {
    render(
      <StrictMode>
        <ScopeIsolationExample />
      </StrictMode>,
    );

    const scope = within(screen.getByRole("region", { name: "Scope A" }));

    fireEvent.click(scope.getByRole("button", { name: "Open A" }));
    fireEvent.click(scope.getByRole("button", { name: "Complete A" }));

    await waitFor(() =>
      expect(scope.getByRole("status").textContent).toBe("Completed: A"),
    );

    fireEvent.click(
      scope.getByRole("button", { name: "Dismiss retained A handles" }),
    );

    expect(scope.getByRole("status").textContent).toBe("Completed: A");

    fireEvent.click(scope.getByRole("button", { name: "Open A" }));
    fireEvent.click(scope.getByRole("button", { name: "Open A" }));
    fireEvent.click(
      scope.getByRole("button", { name: "Dismiss retained A handles" }),
    );
    fireEvent.click(
      scope.getByRole("button", { name: "Dismiss retained A handles" }),
    );

    await waitFor(() =>
      expect(scope.getByRole("status").textContent).toBe("Dismissed: dismiss"),
    );

    expect(
      scope.queryAllByRole("region", { name: "Operation A" }),
    ).toHaveLength(0);

    fireEvent.click(scope.getByRole("button", { name: "Open A" }));
    fireEvent.click(screen.getByRole("button", { name: "Unmount A launcher" }));
    fireEvent.click(screen.getByRole("button", { name: "Mount A launcher" }));

    await waitFor(() =>
      expect(
        scope.queryAllByRole("region", { name: "Operation A" }),
      ).toHaveLength(0),
    );

    expect(scope.getByRole("status").textContent).toBe("Ready");

    fireEvent.click(scope.getByRole("button", { name: "Open A" }));
    fireEvent.click(scope.getByRole("button", { name: "Complete A" }));

    await waitFor(() =>
      expect(scope.getByRole("status").textContent).toBe("Completed: A"),
    );
  });

  it("should suppress pre-cleanup outcomes when the launcher reconnects with preserved state", async () => {
    const registry = createModalRegistry({ operation: scopeOperation });
    const visible = (
      <ModalProvider registry={registry}>
        <Activity mode="visible">
          <ScopeLauncher registry={registry} scope="A" />
        </Activity>
      </ModalProvider>
    );

    const { rerender } = render(visible);

    fireEvent.click(screen.getByRole("button", { name: "Open A" }));

    rerender(
      <ModalProvider registry={registry}>
        <Activity mode="hidden">
          <ScopeLauncher registry={registry} scope="A" />
        </Activity>
      </ModalProvider>,
    );

    rerender(visible);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("status").textContent).toBe("Pending");
    expect(screen.queryByRole("region", { name: "Operation A" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open A" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete A" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Completed: A"),
    );
  });
});
