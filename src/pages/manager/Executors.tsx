import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import StatCard from "../../components/StatCard";
import AddExecutorModal from "../../components/AddExecutorModal";

interface Executor {
  id: string;
  full_name: string;
  is_active: boolean;
  assignedTasks: number;
}

type StatusFilter = "all" | "active" | "inactive";

export default function Executors() {
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadExecutors() {
    setLoading(true);
    setError(null);

    try {
      const { data: profiles, error: profilesError } =
        await supabase
          .from("profiles")
          .select("id, full_name, is_active")
          .eq("role", "executor")
          .order("full_name");

      if (profilesError) throw profilesError;

      const { data: tasks, error: tasksError } =
        await supabase
          .from("tasks")
          .select("assignee_id")
          .not("assignee_id", "is", null)
          .is("deleted_at", null);

      if (tasksError) throw tasksError;

      const taskCounts = new Map<string, number>();

      (tasks ?? []).forEach((task) => {
        if (task.assignee_id) {
          taskCounts.set(
            task.assignee_id,
            (taskCounts.get(task.assignee_id) ?? 0) + 1
          );
        }
      });

      const formattedExecutors: Executor[] = (
        profiles ?? []
      ).map((profile) => ({
        id: profile.id,
        full_name: profile.full_name ?? "Unnamed executor",
        is_active: profile.is_active,
        assignedTasks: taskCounts.get(profile.id) ?? 0,
      }));

      setExecutors(formattedExecutors);
    } catch (err) {
      console.error("Executors loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load executors"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExecutors();
  }, []);

  const filteredExecutors = useMemo(() => {
    return executors.filter((executor) => {
      const matchesSearch = executor.full_name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && executor.is_active) ||
        (statusFilter === "inactive" && !executor.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [executors, search, statusFilter]);

  const activeCount = executors.filter(
    (executor) => executor.is_active
  ).length;

  const inactiveCount = executors.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#263445]">
            Executors
          </h2>

          <p className="mt-1 text-sm text-[#8491A0]">
            Manage your construction team.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#536B82] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#40576D]"
        >
          + Add Executor
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Executors"
          value={executors.length}
          description="All registered executors"
          icon="👷"
          accent="bg-blue-50"
          loading={loading}
        />

        <StatCard
          title="Active Executors"
          value={activeCount}
          description="Currently active"
          icon="✓"
          accent="bg-green-50"
          loading={loading}
        />

        <StatCard
          title="Inactive Executors"
          value={inactiveCount}
          description="Deactivated accounts"
          icon="⏸"
          accent="bg-orange-50"
          loading={loading}
        />
      </div>

      {/* Executors table */}
      <div className="rounded-2xl border border-[#E2E7EC] bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search executors..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none focus:border-[#536B82]"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className="rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none focus:border-[#536B82]"
          >
            <option value="all">All Executors</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-[#8491A0]">
            Loading executors...
          </p>
        ) : error ? null : filteredExecutors.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#8491A0]">
            No executors found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-[#E2E7EC] text-xs text-[#8491A0]">
                  <th className="pb-3 font-medium">Executor</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Assigned Tasks</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredExecutors.map((executor) => (
                  <tr
                    key={executor.id}
                    className="border-b border-[#E2E7EC] last:border-0"
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF0F5] font-semibold text-[#536B82]">
                          {executor.full_name.charAt(0).toUpperCase()}
                        </div>

                        <span className="text-sm font-medium text-[#263445]">
                          {executor.full_name}
                        </span>
                      </div>
                    </td>

                    <td className="py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          executor.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {executor.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="py-4 text-sm text-[#263445]">
                      {executor.assignedTasks}
                    </td>

                    <td className="py-4">
                      <button
                        type="button"
                        className="text-sm font-medium text-[#536B82] hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Executor Modal */}
      <AddExecutorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={loadExecutors}
      />
    </div>
  );
}