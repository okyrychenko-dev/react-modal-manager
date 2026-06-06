export class ModalRejectError extends Error {
  public readonly value: unknown;

  public constructor(value: unknown) {
    super("Modal rejected.");

    this.name = "ModalRejectError";
    this.value = value;
  }
}
