import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScopeIsolationExample } from "../ScopeIsolationExample";

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
});
