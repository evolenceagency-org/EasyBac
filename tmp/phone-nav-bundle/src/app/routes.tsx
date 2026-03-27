import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Dashboard } from "./components/pages/Dashboard";
import { Study } from "./components/pages/Study";
import { Tasks } from "./components/pages/Tasks";
import { Analytics } from "./components/pages/Analytics";
import { Settings } from "./components/pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "study", Component: Study },
      { path: "tasks", Component: Tasks },
      { path: "analytics", Component: Analytics },
      { path: "settings", Component: Settings },
    ],
  },
]);