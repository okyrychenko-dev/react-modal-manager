import type { DialogContentProps } from "@radix-ui/react-dialog";

export type InteractOutsideEvent = Parameters<
  NonNullable<DialogContentProps["onInteractOutside"]>
>[0];
