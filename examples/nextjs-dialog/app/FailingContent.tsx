"use client";

import type { ReactNode } from "react";

export function FailingContent(): ReactNode {
  throw new Error("Intentional customer render failure (recovery demo)");
}
