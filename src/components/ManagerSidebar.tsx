import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

const menuItems = [
  { label: "Profile", path: "/manager/profile", icon: "♙" },
  { label: "Dashboard", path: "/manager/dashboard", icon: "▦" },
  { label: "Executors", path: "/manager/executors", icon: "♙" },
  { label: "Objects", path: "/manager/objects", icon: "▤" },
  { label: "All Tasks", path: "/manager/tasks", icon: "☷" },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error.message);
      return;
    }

    navigate("/login", { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-gray-200 bg-white px-5 py-6">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-xl font-bold text-white">
          C
        </div>

        <div>
          <h1 className="text-lg font-bold text-slate-800">
            ConstructPro
          </h1>
          <p className="text-xs text-gray-400">Management System</p>
        </div>
      </div>

      {/* Navigation */}
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Workspace
      </p>

      <nav className="flex flex-1 flex-col gap-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? "bg-orange-50 text-orange-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-100 pt-4">
        <NavLink
          to="/manager/profile"
          className="mb-2 block rounded-xl px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
        >
          My Profile
        </NavLink>

        <NavLink
          to="/manager/settings"
          className="mb-2 block rounded-xl px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
        >
          Settings
        </NavLink>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 transition-all hover:bg-red-50"
        >
          <span className="text-lg">↪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}