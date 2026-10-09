import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import "./index.css";
import { Board } from "./pages/Board";
import { Home } from "./pages/Home";
import { Plan } from "./pages/Plan";
import { Report } from "./pages/Report";
import { Settings } from "./pages/Settings";
import { Team } from "./pages/Team";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="board" element={<Board />} />
          <Route path="team" element={<Team />} />
          <Route path="plan" element={<Plan />} />
          <Route path="report" element={<Report />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
