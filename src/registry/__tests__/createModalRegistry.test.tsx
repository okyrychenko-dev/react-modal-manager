import { assertDefined } from "@okyrychenko-dev/type-utils";
import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, expectTypeOf, it } from "vitest";
import { assertTypeUtilsAssertion } from "../../test/assertTypeUtilsAssertion";
import { createModalRegistry } from "../createModalRegistry";
import {
  RegistryProviders,
  registryTestModal,
} from "./createModalRegistry.fixtures";
import type { Optional } from "@okyrychenko-dev/type-utils";
import type { ModalHandle } from "../../hooks";
import type { RegistryTestResult } from "./createModalRegistry.fixtures";

function dismissHandle<TResult>(handle: Optional<ModalHandle<TResult>>): void {
  assertDefined(handle);

  act(() => {
    handle.dismiss();
  });

  void handle.catch(() => undefined);
}

describe("createModalRegistry", () => {
  it("should preserve key, input, result, and handle inference", () => {
    const registry = createModalRegistry({ test: registryTestModal });

    expectTypeOf(registry.open).toBeCallableWith("test", {
      label: "Typed modal",
    });

    const assertInvalidCalls = (): void => {
      // @ts-expect-error Registry keys are limited to registered definitions.
      void registry.open("missing", { label: "Typed modal" });
      // @ts-expect-error Registry input is inferred from the selected key.
      void registry.open("test", { invalid: true });
    };

    expectTypeOf(assertInvalidCalls).toEqualTypeOf<VoidFunction>();

    render(
      <RegistryProviders registry={registry} showFirst showSecond={false} />,
    );

    const handle = registry.open("test", { label: "Typed modal" });

    expectTypeOf(handle).toEqualTypeOf<ModalHandle<RegistryTestResult>>();
    expectTypeOf(handle).resolves.toEqualTypeOf<RegistryTestResult>();

    dismissHandle(handle);
  });

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
    let latestHandle: Optional<ModalHandle<RegistryTestResult>>;

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

    let fallbackHandle: Optional<ModalHandle<RegistryTestResult>>;

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

    let handle: Optional<ModalHandle<RegistryTestResult>>;

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
    let firstHandle: Optional<ModalHandle<RegistryTestResult>>;

    act(() => {
      firstHandle = registry.open("test", { label: "First modal" });
    });

    rerender(<RegistryProviders registry={registry} showFirst showSecond />);

    let secondHandle: Optional<ModalHandle<RegistryTestResult>>;

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

    let firstHandle: Optional<ModalHandle<RegistryTestResult>>;
    let secondHandle: Optional<ModalHandle<RegistryTestResult>>;

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
