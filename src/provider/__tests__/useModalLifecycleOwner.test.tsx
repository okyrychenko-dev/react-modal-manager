import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ModalDismissError } from "../../errors/ModalDismissError";
import { useModalLifecycleOwner } from "../useModalLifecycleOwner";
import { renameReportModal } from "./ModalProvider.fixtures";
import type { ReactNode } from "react";

describe("useModalLifecycleOwner", () => {
  it("should preserve lifecycle work through Strict Mode effect replay", async () => {
    const wrapper = ({ children }: { children: ReactNode }): ReactNode => (
      <StrictMode>{children}</StrictMode>
    );
    const { result } = renderHook(() => useModalLifecycleOwner(0), {
      wrapper,
    });

    const handle = result.current.open(renameReportModal, {
      currentName: "Strict Mode",
      reportId: "strict-mode",
    });

    await act(async () => undefined);

    expect(result.current.getSnapshot().instances).toHaveLength(1);

    act(() => {
      handle.dismiss();
    });

    await expect(handle).rejects.toMatchObject({ reason: "dismiss" });
  });

  it("should apply runtime updates without recreating lifecycle state", () => {
    vi.useFakeTimers();

    const { rerender, result } = renderHook(
      ({ closeDelayMs }) => useModalLifecycleOwner(closeDelayMs),
      { initialProps: { closeDelayMs: 0 } },
    );

    const lifecycle = result.current;
    const handle = lifecycle.open(renameReportModal, {
      currentName: "Runtime update",
      reportId: "runtime-update",
    });

    void handle.catch(() => undefined);

    rerender({ closeDelayMs: 200 });

    act(() => {
      handle.dismiss();
    });

    expect(result.current).toBe(lifecycle);
    expect(result.current.getSnapshot().instances[0]?.status).toBe("closing");

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.getSnapshot().instances).toHaveLength(0);
    vi.useRealTimers();
  });

  it("should dispose pending work once after final unmount", async () => {
    const { result, unmount } = renderHook(() => useModalLifecycleOwner(0));

    const lifecycle = result.current;
    const observer = vi.fn();

    lifecycle.subscribe(observer);

    const handle = lifecycle.open(renameReportModal, {
      currentName: "Unmount",
      reportId: "unmount",
    });

    const rejection = expect(handle).rejects.toEqual(
      new ModalDismissError("provider-unmount"),
    );

    unmount();

    await act(async () => undefined);

    await rejection;
    expect(lifecycle.getSnapshot().instances).toHaveLength(0);

    lifecycle.closeAll();

    expect(observer).toHaveBeenCalledTimes(2);
  });
});
