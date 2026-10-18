"use client";

import { ModalProvider } from "@okyrychenko-dev/react-modal-manager";
import type { PropsWithChildren, ReactNode } from "react";

export function AppModalProvider({ children }: PropsWithChildren): ReactNode {
  return <ModalProvider>{children}</ModalProvider>;
}
