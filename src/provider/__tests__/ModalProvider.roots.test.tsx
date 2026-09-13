import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useModalManager } from "../../hooks";
import { createModal } from "../../registry/createModal";
import { ModalProvider } from "../ModalProvider";
import type { Optional } from "@okyrychenko-dev/type-utils";
import type { ReactNode } from "react";
import type { ModalHandle } from "../../hooks";
import type { ModalComponentProps } from "../../types";

interface RootModalInput {
  rootName: string;
}

function RootModal({
  close,
  input,
}: ModalComponentProps<RootModalInput, string>) {
  return (
    <section aria-label={`${input.rootName} modal`} role="dialog">
      <button type="button" onClick={() => close(input.rootName)}>
        Resolve {input.rootName}
      </button>
    </section>
  );
}

const rootModal = createModal<RootModalInput, string>({ component: RootModal });

function RootModalOpener({
  onOpen,
  rootName,
}: {
  onOpen: (handle: ModalHandle<string>) => void;
  rootName: string;
}): ReactNode {
  const manager = useModalManager();

  return (
    <button
      type="button"
      onClick={() => {
        const handle = manager.open(rootModal, { rootName });
        void handle.catch(() => undefined);
        onOpen(handle);
      }}
    >
      Open {rootName}
    </button>
  );
}

describe("ModalProvider roots", () => {
  const pendingHandles: Array<ModalHandle<string>> = [];

  afterEach(() => {
    for (const handle of pendingHandles) {
      handle.dismiss();
    }
    pendingHandles.length = 0;
  });

  it("should isolate modal work between independently rendered roots", async () => {
    let firstHandle: Optional<ModalHandle<string>>;
    let secondHandle: Optional<ModalHandle<string>>;

    const firstRoot = render(
      <ModalProvider>
        <RootModalOpener
          rootName="first root"
          onOpen={(handle) => {
            firstHandle = handle;
            pendingHandles.push(handle);
          }}
        />
      </ModalProvider>,
    );
    const secondRoot = render(
      <ModalProvider>
        <RootModalOpener
          rootName="second root"
          onOpen={(handle) => {
            secondHandle = handle;
            pendingHandles.push(handle);
          }}
        />
      </ModalProvider>,
    );

    fireEvent.click(
      within(firstRoot.container).getByRole("button", {
        name: "Open first root",
      }),
    );
    fireEvent.click(
      within(secondRoot.container).getByRole("button", {
        name: "Open second root",
      }),
    );

    expect(firstHandle?.instanceId).toBe("modal-0");
    expect(secondHandle?.instanceId).toBe("modal-0");

    act(() => {
      firstHandle?.dismiss();
    });

    await expect(firstHandle).rejects.toMatchObject({ reason: "dismiss" });
    expect(
      within(firstRoot.container).queryByRole("dialog"),
    ).not.toBeInTheDocument();
    expect(
      within(secondRoot.container).getByRole("dialog", {
        name: "second root modal",
      }),
    ).toBeInTheDocument();
  });

  it("should route nested and adjacent consumers to their nearest provider", () => {
    render(
      <ModalProvider>
        <RootModalOpener
          rootName="outer"
          onOpen={(handle) => {
            pendingHandles.push(handle);
          }}
        />
        <ModalProvider>
          <RootModalOpener
            rootName="nested"
            onOpen={(handle) => {
              pendingHandles.push(handle);
            }}
          />
        </ModalProvider>
      </ModalProvider>,
    );
    render(
      <ModalProvider>
        <RootModalOpener
          rootName="adjacent"
          onOpen={(handle) => {
            pendingHandles.push(handle);
          }}
        />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open outer" }));
    fireEvent.click(screen.getByRole("button", { name: "Open nested" }));
    fireEvent.click(screen.getByRole("button", { name: "Open adjacent" }));

    expect(
      screen.getByRole("dialog", { name: "outer modal" }),
    ).toHaveTextContent("Resolve outer");
    expect(
      screen.getByRole("dialog", { name: "nested modal" }),
    ).toHaveTextContent("Resolve nested");
    expect(
      screen.getByRole("dialog", { name: "adjacent modal" }),
    ).toHaveTextContent("Resolve adjacent");
    expect(pendingHandles.map((handle) => handle.instanceId)).toEqual([
      "modal-0",
      "modal-0",
      "modal-0",
    ]);
  });

  it("should keep one root live when another root is disposed", async () => {
    let disposedHandle: Optional<ModalHandle<string>>;
    let liveHandle: Optional<ModalHandle<string>>;

    const disposedRoot = render(
      <ModalProvider>
        <RootModalOpener
          rootName="disposed root"
          onOpen={(handle) => {
            disposedHandle = handle;
            pendingHandles.push(handle);
          }}
        />
      </ModalProvider>,
    );

    const liveRoot = render(
      <ModalProvider>
        <RootModalOpener
          rootName="live root"
          onOpen={(handle) => {
            liveHandle = handle;
            pendingHandles.push(handle);
          }}
        />
      </ModalProvider>,
    );

    fireEvent.click(
      within(disposedRoot.container).getByRole("button", {
        name: "Open disposed root",
      }),
    );
    fireEvent.click(
      within(liveRoot.container).getByRole("button", {
        name: "Open live root",
      }),
    );

    const disposedResult = expect(disposedHandle).rejects.toMatchObject({
      reason: "provider-unmount",
    });

    disposedRoot.unmount();

    await act(async () => undefined);

    await disposedResult;
    expect(
      within(liveRoot.container).getByRole("dialog", {
        name: "live root modal",
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(liveRoot.container).getByRole("button", {
        name: "Resolve live root",
      }),
    );
    await expect(liveHandle).resolves.toBe("live root");
  });
});
