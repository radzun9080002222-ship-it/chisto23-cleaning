import { createRoot } from "react-dom/client";
import Achievements from "./internal-calc/Achievements";
import ManagerAccess from "./internal-calc/ManagerAccess";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ManagerAccess title="Достижения" buttonLabel="Открыть достижения">
    {(pin) => <Achievements pin={pin} />}
  </ManagerAccess>,
);
