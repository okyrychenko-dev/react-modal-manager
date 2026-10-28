import { assertDefined, isDefined } from "@okyrychenko-dev/type-utils";
import { act, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";
import { createModalRegistry } from "../../registry";
import { ModalProvider } from "../ModalProvider";
import { renameReportModal } from "./ModalProvider.fixtures";
import { RegistryEffectOpener } from "./RegistryEffectOpener";
import type { Optional } from "@okyrychenko-dev/type-utils";
import type { ConfirmModalResult } from "../../confirm";
import type { ModalHandle } from "../../hooks";

describe.skipIf(!isDefined(React.Activity))("ModalProvider Activity", () => {
  it.each([false, true])(
    "should settle hidden work and allow repeated reveals (Strict Mode: %s)",
    async (strict) => {
      const Activity = React.Activity;

      assertDefined(Activity);

      const registry = createModalRegistry({ rename: renameReportModal });
      const handles: Array<ModalHandle<ConfirmModalResult>> = [];

      const onOpen = (handle: ModalHandle<ConfirmModalResult>): void => {
        handles.push(handle);
      };

      const application = (mode: "visible" | "hidden"): React.ReactNode => {
        const content = (
          <Activity mode={mode}>
            <ModalProvider registry={registry} closeDelayMs={60_000}>
              <RegistryEffectOpener registry={registry} onOpen={onOpen} />
            </ModalProvider>
          </Activity>
        );
        return strict ? (
          <React.StrictMode>{content}</React.StrictMode>
        ) : (
          content
        );
      };

      const { rerender, unmount } = render(application("visible"));

      for (let cycle = 0; cycle < 3; cycle += 1) {
        await act(async () => undefined);

        expect(screen.getAllByRole("dialog")).toHaveLength(handles.length);

        const previous = [...handles];

        rerender(application("hidden"));

        await act(async () => undefined);

        expect(registry.isReady()).toBe(false);

        for (const handle of previous) {
          await expect(handle).rejects.toMatchObject({
            reason: "provider-unmount",
          });
          await expect(handle.whenRemoved()).resolves.toBeUndefined();
        }
        handles.length = 0;

        rerender(application("visible"));

        await act(async () => undefined);

        expect(registry.isReady()).toBe(true);
        expect(screen.getAllByRole("dialog")).toHaveLength(handles.length);

        act(() => {
          for (const handle of previous) {
            handle.dismiss();
          }
        });

        expect(screen.getAllByRole("dialog")).toHaveLength(handles.length);

        let renamed: Optional<ReturnType<typeof registry.open<"rename">>>;

        act(() => {
          renamed = registry.open("rename", {
            currentName: "Revealed",
            reportId: "activity",
          });
        });

        assertDefined(renamed);

        fireEvent.click(await screen.findByRole("button", { name: "Rename" }));

        await expect(renamed).resolves.toEqual({
          status: "renamed",
          name: "Revealed updated",
        });

        const removed = renamed.whenRemoved();
        // Hiding also removes settled content still waiting for its close delay.
        rerender(application("hidden"));

        await act(async () => undefined);
        await expect(removed).resolves.toBeUndefined();

        handles.length = 0;

        rerender(application("visible"));
      }

      unmount();

      await act(async () => undefined);

      for (const handle of handles) {
        await expect(handle).rejects.toMatchObject({
          reason: "provider-unmount",
        });
        await expect(handle.whenRemoved()).resolves.toBeUndefined();
      }

      expect(registry.isReady()).toBe(false);
    },
  );
});
