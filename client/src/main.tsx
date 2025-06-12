import { createRoot } from "react-dom/client";
import App from "./App";
import SimpleApp from "./SimpleApp";
import "./index.css";

// Temporary diagnostic mode to identify the blank screen issue
const useSimpleApp = true;

createRoot(document.getElementById("root")!).render(
  useSimpleApp ? <SimpleApp /> : <App />
);
