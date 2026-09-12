import { AssertionError } from "@okyrychenko-dev/type-utils";
import { expect } from "vitest";

export function assertTypeUtilsAssertion(
  operation: VoidFunction,
  message: string,
): void {
  let thrown: unknown;

  try {
    operation();
  } catch (error: unknown) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(AssertionError);
  expect(thrown).toMatchObject({ message });
}
