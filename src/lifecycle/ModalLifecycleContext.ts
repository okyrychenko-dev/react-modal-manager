import { createContext } from "react";
import type { Optional } from "@okyrychenko-dev/type-utils";
import type { ModalLifecycle } from "./modalLifecycle.types";

export const ModalLifecycleContext =
  createContext<Optional<ModalLifecycle>>(undefined);
