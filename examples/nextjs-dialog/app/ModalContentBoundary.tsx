"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Component } from "react";
import type { ReactNode } from "react";

interface ModalContentBoundaryProps {
  children: ReactNode;
  onDismiss: VoidFunction;
}

interface ModalContentBoundaryState {
  failed: boolean;
}

export class ModalContentBoundary extends Component<
  ModalContentBoundaryProps,
  ModalContentBoundaryState
> {
  state: ModalContentBoundaryState = { failed: false };

  static getDerivedStateFromError(): ModalContentBoundaryState {
    return { failed: true };
  }

  handleDismiss = (): void => {
    const { onDismiss } = this.props;

    onDismiss();
  };

  render(): ReactNode {
    const { children } = this.props;
    const { failed } = this.state;

    if (failed) {
      return (
        <>
          <Dialog.Title>Unable to render customer</Dialog.Title>
          <Dialog.Description>
            The operation is still pending. Dismiss it to finish recovery.
          </Dialog.Description>
          <button onClick={this.handleDismiss}>Dismiss failed dialog</button>
        </>
      );
    }

    return children;
  }
}
