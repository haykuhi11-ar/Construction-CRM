import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "../services/supabase";

const menuItems = [
  {
    label: "Dashboard",
    path: "/executor/dashboard",
    icon: "▦",
  },
  {
    label: "My Tasks",
    path: "/executor/tasks",
    icon: "☷",
  },
  {
    label: "My Objects",
    path: "/executor/objects",
    icon: "▤",
  },
];

const accountItems = [
  {
    label: "My Profile",
    path: "/executor/profile",
    icon: "♙",
  },
  {
    label: "Settings",
    path: "/executor/settings",
    icon: "⚙",
  },
];

export default function ExecutorSidebar() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);

      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  }

  function renderMenuItem(item: {
    label: string;
    path: string;
    icon: string;
  }) {
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
            isActive
              ? "bg-orange-50 text-orange-600"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition ${
                isActive
                  ? "bg-orange-100 text-orange-600"
                  : "text-gray-400 group-hover:text-gray-700"
              }`}
            >
              {item.icon}
            </span>

            <span>{item.label}</span>

            {isActive && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-500" />
            )}
          </>
        )}
      </NavLink>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-gray-200 bg-white">

      {/* Logo */}
      <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-gray-100 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-xl font-bold text-white shadow-lg shadow-orange-200">
          C
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-800">
            Construct<span className="text-orange-500">Pro</span>
          </h1>

          <p className="text-[10px] font-medium uppercase tracking-[2px] text-gray-400">
            Executor workspace
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-7">

        <p className="mb-4 px-4 text-[10px] font-bold uppercase tracking-[1.5px] text-gray-400">
          Workspace
        </p>

        <nav className="space-y-1">
          {menuItems.map(renderMenuItem)}
        </nav>

        <div className="my-7 border-t border-gray-100" />

        <p className="mb-4 px-4 text-[10px] font-bold uppercase tracking-[1.5px] text-gray-400">
          Account
        </p>

        <nav className="space-y-1">
          {accountItems.map(renderMenuItem)}
        </nav>
      </div>

      {/* Logout */}
      <div className="shrink-0 border-t border-gray-100 p-4">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        >
          <span className="text-lg">↪</span>
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>

        <p className="mt-3 text-center text-[10px] text-gray-400">
          ConstructPro CRM © 2026
        </p>
      </div>
    </aside>
  );
}