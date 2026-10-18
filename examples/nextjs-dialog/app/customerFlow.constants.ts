import { createModal } from "@okyrychenko-dev/react-modal-manager";
import { CustomerEditor } from "./CustomerEditor";
import { CustomerSelection } from "./CustomerSelection";
import type { Nullable } from "@okyrychenko-dev/type-utils";
import type { Customer } from "./customerFlow.types";

export const CUSTOMERS: Array<Customer> = [
  { id: "ada", name: "Ada Lovelace" },
  { id: "grace", name: "Grace Hopper" },
];

export const selection = createModal<Array<Customer>, Nullable<Customer>>({
  component: CustomerSelection,
});
export const editor = createModal<Customer, Nullable<Customer>>({
  component: CustomerEditor,
});
