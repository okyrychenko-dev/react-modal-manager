import type { ModalDismissReason } from "../types";

export class ModalDismissError extends Error {
  public readonly reason: ModalDismissReason;

  public constructor(reason: ModalDismissReason) {
    super(`Modal dismissed: ${reason}`);
    this.name = "ModalDismissError";
    this.reason = reason;
  }
}
