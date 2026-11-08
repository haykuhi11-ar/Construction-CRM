import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

interface ExecutorHeaderProps {
  fullName: string;
}

const pageTitles: Record<string, string> = {
  "/executor/dashboard": "Dashboard",
  "/executor/tasks": "My Tasks",
  "/executor/objects": "My Objects",
  "/executor/calendar": "Calendar",
  "/executor/profile": "My Profile",
  "/executor/settings": "Settings",
};

export default function ExecutorHeader({
  fullName,
}: ExecutorHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const pageTitle =
    pageTitles[location.pathname] || "Executor Workspace";

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-gray-200 bg-white/90 px-6 backdrop-blur-md lg:px-8">

      {/* Page title */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          {pageTitle}
        </h2>

        <p className="mt-0.5 text-xs text-gray-400">
          Welcome back, {fullName.split(" ")[0]}
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 sm:gap-5">

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setIsNotificationsOpen((prev) => !prev)
            }
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Notifications"
          >
            ♧

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-orange-500" />
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
              <h3 className="text-sm font-semibold text-gray-800">
                Notifications
              </h3>

              <p className="mt-3 text-sm text-gray-400">
                You don't have any notifications yet.
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden h-9 w-px bg-gray-200 sm:block" />

        {/* Profile */}
        <button
          type="button"
          onClick={() => navigate("/executor/profile")}
          className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-gray-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-orange-100 bg-orange-50 text-sm font-bold text-orange-600">
            {initials || "E"}
          </div>

          <div className="hidden text-left sm:block">
            <p className="max-w-[150px] truncate text-sm font-semibold text-gray-800">
              {fullName}
            </p>

            <p className="text-xs text-gray-400">
              Executor
            </p>
          </div>

          <span className="hidden text-xs text-gray-400 sm:block">
            ⌄
          </span>
        </button>
      </div>
    </header>
  );
}