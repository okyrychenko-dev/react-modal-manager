import { assertDefined } from "@okyrychenko-dev/type-utils";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createModalRegistry } from "../createModalRegistry";
import {
  RegistryProviders,
  registryTestModal,
} from "./createModalRegistry.fixtures";
import type { ModalHandle } from "../../hooks";
import type { RegistryTestResult } from "./createModalRegistry.fixtures";

function dismissHandle<TResult>(
  handle: ModalHandle<TResult> | undefined,
): void {
  assertDefined(handle);

  act(() => {
    handle.dismiss();
  });

  void handle.catch(() => undefined);
}

describe("createModalRegistry", () => {
  it("should report unready and reject opening before a provider mounts", () => {
    const registry = createModalRegistry({ test: registryTestModal });

    expect(registry.isReady()).toBe(false);
    expect(() => registry.open("test", { label: "Unbound" })).toThrow(
      "Modal registry is not bound to a mounted ModalProvider",
    );
  });

  it("should route to the latest provider and fall back after it unmounts", () => {
    const registry = createModalRegistry({ test: registryTestModal });
    const { rerender } = render(
      <RegistryProviders registry={registry} showFirst showSecond />,
    );
    let latestHandle: ModalHandle<RegistryTestResult> | undefined;

    act(() => {
      latestHandle = registry.open("test", { label: "Latest" });
    });

    expect(screen.getByTestId("second-registry-renderer")).toBeInTheDocument();

    dismissHandle(latestHandle);

    rerender(
      <RegistryProviders registry={registry} showFirst showSecond={false} />,
    );

    let fallbackHandle: ModalHandle<RegistryTestResult> | undefined;
    act(() => {
      fallbackHandle = registry.open("test", { label: "Fallback" });
    });

    expect(screen.getByTestId("first-registry-renderer")).toBeInTheDocument();

    dismissHandle(fallbackHandle);
  });

  it("should keep the latest provider active after an older provider unmounts", () => {
    const registry = createModalRegistry({ test: registryTestModal });
    const { rerender } = render(
      <RegistryProviders registry={registry} showFirst showSecond />,
    );

    rerender(
      <RegistryProviders registry={registry} showFirst={false} showSecond />,
    );

    let handle: ModalHandle<RegistryTestResult> | undefined;

    act(() => {
      handle = registry.open("test", { label: "Still active" });
    });

    expect(screen.getByTestId("second-registry-renderer")).toBeInTheDocument();

    dismissHandle(handle);
  });

  it("should route separate registries independently", () => {
    const firstRegistry = createModalRegistry({ test: registryTestModal });
    const secondRegistry = createModalRegistry({ test: registryTestModal });

    render(
      <>
        <RegistryProviders
          registry={firstRegistry}
          showFirst
          showSecond={false}
        />
        <RegistryProviders
          registry={secondRegistry}
          showFirst={false}
          showSecond
        />
      </>,
    );

    let firstHandle: ModalHandle<RegistryTestResult> | undefined;
    let secondHandle: ModalHandle<RegistryTestResult> | undefined;

    act(() => {
      firstHandle = firstRegistry.open("test", { label: "First" });
      secondHandle = secondRegistry.open("test", { label: "Second" });
    });

    expect(screen.getByTestId("first-registry-renderer")).toBeInTheDocument();
    expect(screen.getByTestId("second-registry-renderer")).toBeInTheDocument();

    dismissHandle(firstHandle);
    dismissHandle(secondHandle);
  });
});
