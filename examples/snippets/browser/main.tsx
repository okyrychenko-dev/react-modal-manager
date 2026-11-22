import { assertDefined } from "@okyrychenko-dev/type-utils";
import { createRoot } from "react-dom/client";
import { ConfirmationHarness } from "./ConfirmationHarness";
import "../portable-react.css";

const container = document.getElementById("root");
assertDefined(container);
createRoot(container).render(<ConfirmationHarness />);
