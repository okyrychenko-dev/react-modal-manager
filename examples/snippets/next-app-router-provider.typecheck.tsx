"use client";

import { ModalProvider } from "@okyrychenko-dev/react-modal-manager";
import type { PropsWithChildren, ReactNode } from "react";

export function AppModalProvider(props: PropsWithChildren): ReactNode {
  const { children } = props;

  return <ModalProvider>{children}</ModalProvider>;
}
