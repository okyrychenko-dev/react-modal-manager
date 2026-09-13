import { cpus, platform, release } from "node:os";
import { performance } from "node:perf_hooks";
import {
  ModalProvider,
  createModal,
  createModalRegistry,
  useModalManager,
} from "@okyrychenko-dev/react-modal-manager";
import { Window } from "happy-dom";
import React, { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

const window = new Window({ url: "http://localhost" });
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.MutationObserver = window.MutationObserver;

const warmupSamples = 20;
const defaultSamples = 100;
const stackSize = 25;
const closeDelayMs = 5;

const benchmarkModal = createModal({
  component: () => createElement("span", { "data-benchmark-modal": "" }),
  id: "benchmark-modal",
});

function percentile(sortedSamples, fraction) {
  return sortedSamples[Math.ceil(sortedSamples.length * fraction) - 1];
}

function summarize(samples) {
  const sortedSamples = [...samples].sort((left, right) => left - right);
  const total = samples.reduce((sum, sample) => sum + sample, 0);

  return {
    maximumMicroseconds: sortedSamples.at(-1),
    meanMicroseconds: total / samples.length,
    minimumMicroseconds: sortedSamples[0],
    p50Microseconds: percentile(sortedSamples, 0.5),
    p95Microseconds: percentile(sortedSamples, 0.95),
  };
}

async function measureScenario({
  name,
  run,
  samples = defaultSamples,
  setup,
  teardown,
}) {
  const measureOnce = async () => {
    const context = await setup();
    const startedAt = performance.now();

    await run(context);

    const durationMicroseconds = (performance.now() - startedAt) * 1_000;

    await teardown(context);

    return durationMicroseconds;
  };

  for (let index = 0; index < warmupSamples; index += 1) {
    await measureOnce();
  }

  const rawMicroseconds = [];

  for (let index = 0; index < samples; index += 1) {
    rawMicroseconds.push(await measureOnce());
  }

  return {
    name,
    rawMicroseconds,
    samples,
    summary: summarize(rawMicroseconds),
    warmupSamples,
  };
}

function createContainerRoot() {
  const container = document.createElement("div");

  document.body.append(container);

  return { container, root: createRoot(container) };
}

function mountProvider({ closeDelay = 0, registry } = {}) {
  const mountedRoot = createContainerRoot();
  let manager;

  function CaptureManager() {
    manager = useModalManager();

    return null;
  }

  flushSync(() => {
    mountedRoot.root.render(
      createElement(
        ModalProvider,
        { closeDelayMs: closeDelay, registry },
        createElement(CaptureManager),
      ),
    );
  });

  if (!manager) {
    throw new Error("Benchmark provider did not expose its modal manager");
  }

  return { ...mountedRoot, manager };
}

function unmountProvider({ container, root }) {
  root.unmount();
  container.remove();
}

function openHandled(manager) {
  const handle = manager.open(benchmarkModal);

  void handle.catch(() => undefined);

  return handle;
}

function openRendered(context) {
  let handle;

  flushSync(() => {
    handle = openHandled(context.manager);
  });

  if (!context.container.querySelector("[data-benchmark-modal]")) {
    throw new Error("Benchmark modal did not render during setup");
  }
  return handle;
}

function observeRemoval(container) {
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      observer.disconnect();
      reject(new Error("Timed out waiting for delayed modal removal"));
    }, 1_000);

    const observer = new MutationObserver(() => {
      if (!container.querySelector("[data-benchmark-modal]")) {
        globalThis.clearTimeout(timeout);
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(container, { childList: true, subtree: true });
  });
}

const scenarios = [];

scenarios.push(
  await measureScenario({
    name: "provider mount",
    run: ({ root }) => {
      flushSync(() => {
        root.render(createElement(ModalProvider));
      });
    },
    setup: createContainerRoot,
    teardown: unmountProvider,
  }),
);

scenarios.push(
  await measureScenario({
    name: "provider unmount",
    run: ({ root }) => {
      root.unmount();
    },
    setup: mountProvider,
    teardown: ({ container }) => {
      container.remove();
    },
  }),
);

scenarios.push(
  await measureScenario({
    name: "open and render",
    run: ({ manager }) => {
      flushSync(() => {
        openHandled(manager);
      });
    },
    setup: mountProvider,
    teardown: (context) => {
      context.manager.closeAll();
      unmountProvider(context);
    },
  }),
);

scenarios.push(
  await measureScenario({
    name: "settle and remove",
    run: ({ handle }) => {
      flushSync(() => {
        handle.dismiss();
      });
    },
    setup: () => {
      const context = mountProvider();
      return { ...context, handle: openRendered(context) };
    },
    teardown: unmountProvider,
  }),
);

scenarios.push(
  await measureScenario({
    name: "delayed removal",
    run: async ({ handle, removal }) => {
      flushSync(() => {
        handle.dismiss();
      });
      await removal;
    },
    samples: 20,
    setup: () => {
      const context = mountProvider({ closeDelay: closeDelayMs });
      const handle = openRendered(context);
      return {
        ...context,
        handle,
        removal: observeRemoval(context.container),
      };
    },
    teardown: unmountProvider,
  }),
);

scenarios.push(
  await measureScenario({
    name: `open and render ${stackSize} stacked instances`,
    run: ({ container, manager }) => {
      flushSync(() => {
        for (let index = 0; index < stackSize; index += 1) {
          openHandled(manager);
        }
      });
      if (
        container.querySelectorAll("[data-benchmark-modal]").length !==
        stackSize
      ) {
        throw new Error(
          "Stacked modal render count did not match the scenario",
        );
      }
    },
    setup: mountProvider,
    teardown: (context) => {
      context.manager.closeAll();
      unmountProvider(context);
    },
  }),
);

scenarios.push(
  await measureScenario({
    name: "typed registry route, open, and render",
    run: ({ registry }) => {
      flushSync(() => {
        const handle = registry.open("benchmark");
        void handle.catch(() => undefined);
      });
    },
    setup: () => {
      const registry = createModalRegistry({ benchmark: benchmarkModal });
      return { ...mountProvider({ registry }), registry };
    },
    teardown: (context) => {
      context.registry.closeAll();
      unmountProvider(context);
    },
  }),
);

console.log(
  JSON.stringify(
    {
      environment: {
        architecture: globalThis.process.arch,
        buildMode: globalThis.process.env.NODE_ENV,
        comparisonVersion: null,
        cpu: cpus()[0]?.model,
        node: globalThis.process.version,
        operatingSystem: `${platform()} ${release()}`,
        react: React.version,
      },
      method:
        "Each scenario runs setup outside the timed region, warms up first, then records wall-clock duration for every optimized-build operation with performance.now().",
      scenarios,
    },
    null,
    2,
  ),
);
