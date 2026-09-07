import { ModalProvider } from "../../provider";
import { createModal } from "../createModal";
import type { ReactNode } from "react";
import type { ModalComponentProps } from "../../types";
import type { ModalRendererProps } from "../../viewport";
import type { ModalRegistryBinding } from "../createModalRegistry.types";

interface RegistryTestInput {
  label: string;
}

export interface RegistryTestResult {
  label: string;
}

function RegistryTestModal(
  props: ModalComponentProps<RegistryTestInput, RegistryTestResult>,
): ReactNode {
  const { input } = props;

  return <section aria-label={input.label} role="dialog" />;
}

export const registryTestModal = createModal<
  RegistryTestInput,
  RegistryTestResult
>({ component: RegistryTestModal });

export function FirstRegistryRenderer(props: ModalRendererProps): ReactNode {
  const { children } = props;

  return <div data-testid="first-registry-renderer">{children}</div>;
}

export function SecondRegistryRenderer(props: ModalRendererProps): ReactNode {
  const { children } = props;

  return <div data-testid="second-registry-renderer">{children}</div>;
}

interface RegistryProvidersProps {
  registry: ModalRegistryBinding;
  showFirst: boolean;
  showSecond: boolean;
}

export function RegistryProviders(props: RegistryProvidersProps): ReactNode {
  const { registry, showFirst, showSecond } = props;

  return (
    <>
      {showFirst && (
        <ModalProvider registry={registry} renderer={FirstRegistryRenderer}>
          <div />
        </ModalProvider>
      )}
      {showSecond && (
        <ModalProvider registry={registry} renderer={SecondRegistryRenderer}>
          <div />
        </ModalProvider>
      )}
    </>
  );
}
