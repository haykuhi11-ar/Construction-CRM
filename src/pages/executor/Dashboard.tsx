import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

type Task = {
  id: string;
  title: string;
  status: "new" | "in_progress" | "under_review" | "accepted" | "revision";
  object_id: string;
  updated_at: string;
};

type ObjectItem = {
  id: string;
  name: string;
};

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, status, object_id, updated_at")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (tasksError) throw tasksError;

      const loadedTasks = (tasksData ?? []) as Task[];
      setTasks(loadedTasks);

      const objectIds = [
        ...new Set(loadedTasks.map((task) => task.object_id)),
      ];

      if (objectIds.length > 0) {
        const { data: objectsData, error: objectsError } = await supabase
          .from("objects")
          .select("id, name")
          .in("id", objectIds);

        if (objectsError) throw objectsError;

        setObjects(objectsData ?? []);
      } else {
        setObjects([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  const getCount = (status: Task["status"]) =>
    tasks.filter((task) => task.status === status).length;

  const acceptedCount = getCount("accepted");

  const progress =
    tasks.length > 0
      ? Math.round((acceptedCount / tasks.length) * 100)
      : 0;

  const stats = [
    {
      title: "Total Tasks",
      value: tasks.length,
      icon: "☷",
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
    {
      title: "New",
      value: getCount("new"),
      icon: "✦",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "In Progress",
      value: getCount("in_progress"),
      icon: "◷",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Under Review",
      value: getCount("under_review"),
      icon: "⌕",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Accepted",
      value: acceptedCount,
      icon: "✓",
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  const getStatusStyle = (status: Task["status"]) => {
    const styles = {
      new: "bg-blue-50 text-blue-600",
      in_progress: "bg-orange-50 text-orange-600",
      under_review: "bg-purple-50 text-purple-600",
      accepted: "bg-green-50 text-green-600",
      revision: "bg-red-50 text-red-600",
    };

    return styles[status];
  };

  const getStatusLabel = (status: Task["status"]) => {
    const labels = {
      new: "New",
      in_progress: "In Progress",
      under_review: "Under Review",
      accepted: "Accepted",
      revision: "Revision",
    };

    return labels[status];
  };

  const getObjectName = (objectId: string) =>
    objects.find((object) => object.id === objectId)?.name ?? "Unknown object";

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-5">
        <p className="text-sm text-red-600">{error}</p>

        <button
          onClick={loadDashboard}
          className="mt-3 text-sm font-medium text-red-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          My Workspace
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Track your tasks and monitor your work progress.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                {stat.title}
              </p>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${stat.bg} ${stat.color}`}
              >
                {stat.icon}
              </div>
            </div>

            <p className="mt-4 text-3xl font-bold text-slate-800">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Tasks and Progress */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent Tasks */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Recent Tasks
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Your recently updated tasks
              </p>
            </div>

            <span className="text-sm font-medium text-orange-500">
              Last 5 tasks
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl">☷</p>
              <p className="mt-3 font-medium text-slate-700">
                No tasks assigned yet
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Your assigned tasks will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      {task.title}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {getObjectName(task.object_id)}
                    </p>
                  </div>

                  <span
                    className={`w-fit shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${getStatusStyle(task.status)}`}
                  >
                    {getStatusLabel(task.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">
            My Progress
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Your task completion rate
          </p>

          <div className="my-8 flex justify-center">
            <div
              className="flex h-40 w-40 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#f97316 ${progress}%, #f1f5f9 ${progress}% 100%)`,
              }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-3xl font-bold text-slate-800">
                  {progress}%
                </span>

                <span className="text-xs text-slate-400">
                  Completed
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Accepted tasks
              </span>

              <span className="font-semibold text-green-600">
                {acceptedCount}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Need revision
              </span>

              <span className="font-semibold text-red-500">
                {getCount("revision")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}