import { createContext } from "react";
import type { Optional } from "@okyrychenko-dev/type-utils";

export const DialogFocusContext = createContext<Optional<string>>(undefined);
