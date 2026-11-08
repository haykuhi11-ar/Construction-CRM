
import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

interface Task {
  id: string;
  title: string;
  status: string;
  created_at: string;
  assignee_id: string | null;
  object_id: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
}

interface ConstructionObject {
  id: string;
  name: string | null;
}

interface RecentTask extends Task {
  executorName: string;
  objectName: string;
}

interface DashboardStats {
  executors: number;
  objects: number;
  inProgress: number;
  underReview: number;
}

const initialStats: DashboardStats = {
  executors: 0,
  objects: 0,
  inProgress: 0,
  underReview: 0,
};

const statusStyles: Record<string, string> = {
  new: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-50 text-blue-700",
  under_review: "bg-amber-50 text-amber-700",
  accepted: "bg-green-50 text-green-700",
  revision: "bg-red-50 text-red-700",
};

const statusLabels: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  under_review: "Under Review",
  accepted: "Accepted",
  revision: "Revision",
};

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [
          executorsResult,
          objectsResult,
          inProgressResult,
          underReviewResult,
          tasksResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "executor")
            .eq("is_active", true),

          supabase
            .from("objects")
            .select("id", { count: "exact", head: true })
            .eq("is_archived", false),

          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("status", "in_progress")
            .is("deleted_at", null),

          supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("status", "under_review")
            .is("deleted_at", null),

          supabase
            .from("tasks")
            .select(
              "id, title, status, created_at, assignee_id, object_id"
            )
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        const results = [
          executorsResult,
          objectsResult,
          inProgressResult,
          underReviewResult,
          tasksResult,
        ];

        const failedResult = results.find((result) => result.error);

        if (failedResult?.error) {
          throw failedResult.error;
        }

        const tasks: Task[] = tasksResult.data ?? [];

        const executorIds = [
          ...new Set(
            tasks
              .map((task) => task.assignee_id)
              .filter((id): id is string => id !== null)
          ),
        ];

        const objectIds = [
          ...new Set(
            tasks
              .map((task) => task.object_id)
              .filter((id): id is string => id !== null)
          ),
        ];

        let profiles: Profile[] = [];
        let objects: ConstructionObject[] = [];

        if (executorIds.length > 0) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", executorIds);

          if (error) throw error;

          profiles = (data ?? []) as Profile[];
        }

        if (objectIds.length > 0) {
          const { data, error } = await supabase
            .from("objects")
            .select("id, name")
            .in("id", objectIds);

          if (error) throw error;

          objects = (data ?? []) as ConstructionObject[];
        }

        const profilesMap = new Map<string, string>(
          profiles.map((profile) => [
            profile.id,
            profile.full_name ?? "Unknown executor",
          ])
        );

        const objectsMap = new Map<string, string>(
          objects.map((object) => [
            object.id,
            object.name ?? "Unknown object",
          ])
        );

        const formattedTasks: RecentTask[] = tasks.map((task) => ({
          ...task,
          executorName: task.assignee_id
            ? profilesMap.get(task.assignee_id) ?? "Unknown executor"
            : "Global Tasks",
          objectName: task.object_id
            ? objectsMap.get(task.object_id) ?? "Unknown object"
            : "No object",
        }));

        if (!isMounted) return;

        setStats({
          executors: executorsResult.count ?? 0,
          objects: objectsResult.count ?? 0,
          inProgress: inProgressResult.count ?? 0,
          underReview: underReviewResult.count ?? 0,
        });

        setRecentTasks(formattedTasks);
      } catch (err) {
        console.error("Dashboard loading error:", err);

        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load dashboard data"
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const statCards = [
    {
      title: "Active Executors",
      value: stats.executors,
      icon: "👷",
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Active Objects",
      value: stats.objects,
      icon: "🏗️",
      color: "bg-orange-50 text-orange-600",
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: "📋",
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Under Review",
      value: stats.underReview,
      icon: "⏳",
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#263445]">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-[#8491A0]">
          Overview of your construction management workspace.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load dashboard: {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-[#E2E7EC] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#8491A0]">
                {card.title}
              </p>

              <div className={`rounded-xl p-3 ${card.color}`}>
                <span className="text-xl">{card.icon}</span>
              </div>
            </div>

            {loading ? (
              <div className="mt-5 h-9 w-16 animate-pulse rounded-lg bg-gray-100" />
            ) : (
              <p className="mt-5 text-3xl font-bold text-[#263445]">
                {card.value}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#E2E7EC] bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-[#263445]">
            Recent Tasks
          </h3>

          <p className="mt-1 text-sm text-[#8491A0]">
            Latest tasks in your workspace.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-lg bg-gray-100"
              />
            ))}
          </div>
        ) : recentTasks.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#8491A0]">
            No tasks found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-[#E2E7EC] text-xs text-[#8491A0]">
                  <th className="pb-3 font-medium">Task</th>
                  <th className="pb-3 font-medium">Executor</th>
                  <th className="pb-3 font-medium">Object</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {recentTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-[#E2E7EC] last:border-0"
                  >
                    <td className="py-4 pr-4 text-sm font-medium text-[#263445]">
                      {task.title}
                    </td>

                    <td className="py-4 pr-4 text-sm text-[#8491A0]">
                      {task.executorName}
                    </td>

                    <td className="py-4 pr-4 text-sm text-[#8491A0]">
                      {task.objectName}
                    </td>

                    <td className="py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                          statusStyles[task.status] ??
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {statusLabels[task.status] ?? task.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;