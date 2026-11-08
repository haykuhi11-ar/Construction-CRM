import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/ManagerSidebar";
import Header from "../components/ManagerHeader";

const pageTitles: Record<string, string> = {
  "/manager/dashboard": "Dashboard",
  "/manager/executors": "Executors",
  "/manager/objects": "Construction Objects",
  "/manager/tasks": "All Tasks",
  "/manager/global-tasks": "Global Tasks",
  "/manager/calendar": "Calendar",
  "/manager/profile": "My Profile",
  "/manager/settings": "Settings",
};

export default function ManagerLayout() {
  const location = useLocation();

  const title = pageTitles[location.pathname] || "Manager Panel";

  return (
    <div className="min-h-screen bg-[#F1F3F5]">
      <Sidebar />

      <div className="ml-64 min-h-screen">
        <Header title={title} subtitle="Construction Management System" />

        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}