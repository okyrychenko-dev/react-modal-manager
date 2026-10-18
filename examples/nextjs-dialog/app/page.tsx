import { CustomerFlowExample } from "./CustomerFlowExample";
import { DialogExample } from "./DialogExample";
import type { ReactNode } from "react";

export default function Page(): ReactNode {
  return (
    <main>
      <h1>Report workspace</h1>
      <p>Next.js server route with a client-owned dialog.</p>
      <DialogExample />
      <CustomerFlowExample />
    </main>
  );
}
