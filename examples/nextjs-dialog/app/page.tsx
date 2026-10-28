import { CustomerFlowExample } from "./CustomerFlowExample";
import { DialogExample } from "./DialogExample";
import type { ReactNode } from "react";

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Report workspace</h1>
      <p>
        Pick a customer, edit their name and confirm the change, or cancel along
        the way. Each new flow starts with the original data. You can also try
        opening a broken dialog and recovering from it.
      </p>
      <DialogExample />
      <CustomerFlowExample />
    </main>
  );
}
