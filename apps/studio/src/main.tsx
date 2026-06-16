import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Studio } from "@react-arch/studio";
// The building registry root. In-repo this resolves to the bundled examples;
// the `react-arch studio` CLI aliases it to the user's project entry.
import Root from "virtual:react-arch-root";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Studio root={Root} />
  </StrictMode>,
);
