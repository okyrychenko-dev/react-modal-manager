import { assertDefined } from "@okyrychenko-dev/type-utils";
import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { assertTypeUtilsAssertion } from "../../test/assertTypeUtilsAssertion";
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
    const openBeforeBinding = (): void => {
      void registry.open("test", { label: "Unbound" });
    };

    assertTypeUtilsAssertion(
      openBeforeBinding,
      "Modal registry is not bound to a mounted ModalProvider",
    );
  });

  it("should route to the latest provider and fall back after it unmounts", () => {
    const registry = createModalRegistry({ test: registryTestModal });
    const { rerender } = render(
      <RegistryProviders registry={registry} showFirst showSecond />,
    );
    let latestHandle: ModalHandle<RegistryTestResult> | undefined;

    expect(registry.isReady()).toBe(true);

    act(() => {
      latestHandle = registry.open("test", { label: "Latest" });
    });

    expect(
      within(screen.getByTestId("second-registry-renderer")).getByRole(
        "dialog",
        { name: "Latest" },
      ),
    ).toBeInTheDocument();

    dismissHandle(latestHandle);

    rerender(
      <RegistryProviders registry={registry} showFirst showSecond={false} />,
    );

    expect(registry.isReady()).toBe(true);

    let fallbackHandle: ModalHandle<RegistryTestResult> | undefined;
    act(() => {
      fallbackHandle = registry.open("test", { label: "Fallback" });
    });

    expect(
      within(screen.getByTestId("first-registry-renderer")).getByRole(
        "dialog",
        { name: "Fallback" },
      ),
    ).toBeInTheDocument();

    dismissHandle(fallbackHandle);

    rerender(
      <RegistryProviders
        registry={registry}
        showFirst={false}
        showSecond={false}
      />,
    );

    expect(registry.isReady()).toBe(false);
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

    expect(
      within(screen.getByTestId("second-registry-renderer")).getByRole(
        "dialog",
        { name: "Still active" },
      ),
    ).toBeInTheDocument();

    dismissHandle(handle);
  });

  it("should keep handles attached to the provider that created them", () => {
    const registry = createModalRegistry({ test: registryTestModal });
    const { rerender } = render(
      <RegistryProviders registry={registry} showFirst showSecond={false} />,
    );
    let firstHandle: ModalHandle<RegistryTestResult> | undefined;

    act(() => {
      firstHandle = registry.open("test", { label: "First modal" });
    });

    rerender(<RegistryProviders registry={registry} showFirst showSecond />);

    let secondHandle: ModalHandle<RegistryTestResult> | undefined;

    act(() => {
      secondHandle = registry.open("test", { label: "Second modal" });
    });

    dismissHandle(firstHandle);

    expect(
      screen.queryByRole("dialog", { name: "First modal" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Second modal" }),
    ).toBeInTheDocument();

    dismissHandle(secondHandle);
  });

  it("should preserve independent routing order for separate registries", () => {
    const firstRegistry = createModalRegistry({ test: registryTestModal });
    const secondRegistry = createModalRegistry({ test: registryTestModal });

    const { rerender } = render(
      <>
        <RegistryProviders registry={firstRegistry} showFirst showSecond />
        <RegistryProviders registry={secondRegistry} showFirst showSecond />
      </>,
    );

    let firstHandle: ModalHandle<RegistryTestResult> | undefined;
    let secondHandle: ModalHandle<RegistryTestResult> | undefined;

    act(() => {
      firstHandle = firstRegistry.open("test", { label: "First latest" });
      secondHandle = secondRegistry.open("test", { label: "Second latest" });
    });

    const latestRenderers = screen.getAllByTestId("second-registry-renderer");

    expect(
      within(latestRenderers[0]).getByRole("dialog", {
        name: "First latest",
      }),
    ).toBeInTheDocument();
    expect(
      within(latestRenderers[1]).getByRole("dialog", {
        name: "Second latest",
      }),
    ).toBeInTheDocument();

    dismissHandle(firstHandle);
    dismissHandle(secondHandle);

    rerender(
      <>
        <RegistryProviders
          registry={firstRegistry}
          showFirst
          showSecond={false}
        />
        <RegistryProviders registry={secondRegistry} showFirst showSecond />
      </>,
    );

    act(() => {
      firstHandle = firstRegistry.open("test", { label: "First fallback" });
      secondHandle = secondRegistry.open("test", { label: "Second remains" });
    });

    const firstRenderers = screen.getAllByTestId("first-registry-renderer");

    expect(
      within(firstRenderers[0]).getByRole("dialog", {
        name: "First fallback",
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("second-registry-renderer")).getByRole(
        "dialog",
        { name: "Second remains" },
      ),
    ).toBeInTheDocument();

    dismissHandle(firstHandle);
    dismissHandle(secondHandle);
  });
});
