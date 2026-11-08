import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import TaskDetailsModal from "../../components/TaskDetailModal";

type TaskStatus =
  | "new"
  | "in_progress"
  | "under_review"
  | "accepted"
  | "revision";

type Task = {
  id: string;
  title: string;
  description: string | null;
  object_id: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
};

type ObjectItem = {
  id: string;
  name: string;
  address: string | null;
};

const filters = [
  { label: "All Tasks", value: "all" },
  { label: "New", value: "new" },
  { label: "In Progress", value: "in_progress" },
  { label: "Under Review", value: "under_review" },
  { label: "Revision", value: "revision" },
  { label: "Accepted", value: "accepted" },
];

const statusLabels: Record<TaskStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  under_review: "Under Review",
  accepted: "Accepted",
  revision: "Revision",
};

const statusStyles: Record<TaskStatus, string> = {
  new: "bg-blue-50 text-blue-600",
  in_progress: "bg-orange-50 text-orange-600",
  under_review: "bg-purple-50 text-purple-600",
  accepted: "bg-green-50 text-green-600",
  revision: "bg-red-50 text-red-600",
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Load executor tasks and related objects
  const loadTasks = async () => {
    setLoading(true);
    setError("");

    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(
          "id, title, description, object_id, status, created_at, updated_at"
        )
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
          .select("id, name, address")
          .in("id", objectIds);

        if (objectsError) throw objectsError;

        setObjects(objectsData ?? []);
      } else {
        setObjects([]);
      }
    } catch (err) {
      console.error("Executor tasks loading error:", err);

      setError(
        err instanceof Error ? err.message : "Failed to load tasks."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Change task status through Supabase RPC
  const handleStatusChange = async (
    task: Task,
    newStatus: TaskStatus
  ) => {
    setUpdatingTaskId(task.id);
    setActionError("");

    try {
      const { error: statusError } = await supabase.rpc(
        "change_task_status",
        {
          p_task_id: task.id,
          p_new_status: newStatus,
          p_comment: null,
        }
      );

      if (statusError) throw statusError;

      await loadTasks();
      setSelectedTask(null);
    } catch (err) {
      console.error("Task status update error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to update task status."
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Object lookup
  const objectMap = useMemo(
    () => new Map(objects.map((object) => [object.id, object])),
    [objects]
  );

  const getObjectName = (objectId: string) =>
    objectMap.get(objectId)?.name ?? "Unknown object";

  const getObjectAddress = (objectId: string) =>
    objectMap.get(objectId)?.address ?? "";

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus =
        activeFilter === "all" || task.status === activeFilter;

      const objectName = getObjectName(task.object_id);
      const searchValue = search.trim().toLowerCase();

      const matchesSearch =
        task.title.toLowerCase().includes(searchValue) ||
        objectName.toLowerCase().includes(searchValue);

      return matchesStatus && matchesSearch;
    });
  }, [tasks, objectMap, activeFilter, search]);

  // Statistics
  const taskCounts = useMemo(() => {
    return {
      new: tasks.filter((task) => task.status === "new").length,
      in_progress: tasks.filter(
        (task) => task.status === "in_progress"
      ).length,
      under_review: tasks.filter(
        (task) => task.status === "under_review"
      ).length,
      revision: tasks.filter(
        (task) => task.status === "revision"
      ).length,
      accepted: tasks.filter(
        (task) => task.status === "accepted"
      ).length,
    };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          My Tasks
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          View and manage your assigned tasks.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {filters.slice(1).map((filter) => {
          const count =
            taskCounts[filter.value as keyof typeof taskCounts];

          return (
            <div
              key={filter.value}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-slate-500">
                {filter.label}
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-800">
                {count}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeFilter === filter.value
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks or objects..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 xl:max-w-xs"
          />
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {actionError}
        </div>
      )}

      {/* Task list */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h3 className="font-semibold text-slate-800">
            Tasks ({filteredTasks.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Loading tasks...
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-500">{error}</p>

            <button
              type="button"
              onClick={loadTasks}
              className="mt-3 text-sm font-medium text-orange-500 transition hover:text-orange-600"
            >
              Try again
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl">☷</p>

            <p className="mt-3 font-medium text-slate-700">
              No tasks found
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Your tasks will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h4 className="truncate font-semibold text-slate-800">
                    {task.title}
                  </h4>

                  <p className="mt-1 text-sm text-slate-400">
                    {getObjectName(task.object_id)}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Updated:{" "}
                    {new Date(task.updated_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${statusStyles[task.status]}`}
                  >
                    {statusLabels[task.status]}
                  </span>

                  {/* Start or continue task */}
                  {(task.status === "new" ||
                    task.status === "revision") && (
                    <button
                      type="button"
                      disabled={updatingTaskId !== null}
                      onClick={() =>
                        handleStatusChange(task, "in_progress")
                      }
                      className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingTaskId === task.id
                        ? "Updating..."
                        : task.status === "new"
                          ? "Start Task"
                          : "Continue Work"}
                    </button>
                  )}

                  {/* Submit task for manager review */}
                  {task.status === "in_progress" && (
                    <button
                      type="button"
                      disabled={updatingTaskId !== null}
                      onClick={() =>
                        handleStatusChange(task, "under_review")
                      }
                      className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingTaskId === task.id
                        ? "Sending..."
                        : "Submit for Review"}
                    </button>
                  )}

                  {/* Task details */}
                  <button
                    type="button"
                    onClick={() => setSelectedTask(task)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 active:scale-95"
                  >
                    View Details
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Universal Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          objectName={getObjectName(selectedTask.object_id)}
          objectAddress={getObjectAddress(selectedTask.object_id)}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}