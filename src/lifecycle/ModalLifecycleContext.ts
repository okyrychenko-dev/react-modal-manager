import { createContext } from "react";
import type { ModalLifecycle } from "./modalLifecycle.types";

export const ModalLifecycleContext = createContext<ModalLifecycle | undefined>(
  undefined,
);
