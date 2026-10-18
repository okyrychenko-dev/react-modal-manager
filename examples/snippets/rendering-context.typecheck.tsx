import { createModal } from "@okyrychenko-dev/react-modal-manager";
import { createContext, useContext } from "react";
import type { ModalComponentProps } from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

export const ReportContext = createContext("default");

interface ReportInput {
  reportName: string;
}

function ReportModal({
  input,
  close,
}: ModalComponentProps<ReportInput, void>): ReactNode {
  const workspace = useContext(ReportContext);

  function handleDone(): void {
    close();
  }

  return (
    <section role="dialog" aria-label="Report context">
      <p>
        {workspace}: {input.reportName}
      </p>
      <button onClick={handleDone}>Done</button>
    </section>
  );
}

export const ContextReportModal = createModal({ component: ReportModal });
