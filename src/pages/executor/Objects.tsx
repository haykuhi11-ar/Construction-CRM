import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import ObjectDetailsModal from "../../components/ObjectDetailsModal";
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
  is_archived: boolean;
};

export default function Objects() {
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedObject, setSelectedObject] = useState<ObjectItem | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadObjects();
  }, []);

  const loadObjects = async () => {
    setLoading(true);
    setError("");

    try {
      const { data: objectsData, error: objectsError } = await supabase
        .from("objects")
        .select("id, name, address, is_archived")
        .order("created_at", { ascending: false });

      if (objectsError) throw objectsError;

      setObjects((objectsData ?? []) as ObjectItem[]);

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(
          "id, title, description, object_id, status, created_at, updated_at"
        )
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (tasksError) throw tasksError;

      setTasks((tasksData ?? []) as Task[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load objects."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredObjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return objects.filter(
      (object) =>
        object.name.toLowerCase().includes(normalizedSearch) ||
        (object.address ?? "").toLowerCase().includes(normalizedSearch)
    );
  }, [objects, search]);

  const getObjectTasks = (objectId: string) =>
    tasks.filter((task) => task.object_id === objectId);

  const handleSelectTask = (task: Task) => {
    setSelectedObject(null);
    setSelectedTask(task);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">My Objects</h2>
        <p className="mt-1 text-sm text-slate-500">
          View your work objects and the tasks assigned to you.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Available objects</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {objects.length}
          </p>
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search objects..."
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-400 sm:max-w-xs"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-sm text-slate-400">
          Loading objects...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>

          <button
            onClick={loadObjects}
            className="mt-3 text-sm font-medium text-red-700 underline"
          >
            Try again
          </button>
        </div>
      ) : filteredObjects.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <p className="text-3xl">▤</p>
          <p className="mt-3 font-medium text-slate-700">
            No objects found
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Objects containing your assigned tasks will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredObjects.map((object) => {
            const objectTasks = getObjectTasks(object.id);

            return (
              <button
                key={object.id}
                onClick={() => setSelectedObject(object)}
                className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl text-orange-500">
                    ▤
                  </div>

                  {object.is_archived && (
                    <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                      Archived
                    </span>
                  )}
                </div>

                <h3 className="mt-5 truncate text-lg font-semibold text-slate-800">
                  {object.name}
                </h3>

                <p className="mt-2 min-h-10 text-sm text-slate-400">
                  {object.address || "No address provided"}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="text-sm text-slate-500">My tasks</span>

                  <span className="rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-600">
                    {objectTasks.length}
                  </span>
                </div>

                <p className="mt-4 text-sm font-medium text-orange-500">
                  View details →
                </p>
              </button>
            );
          })}
        </div>
      )}

      {selectedObject && (
        <ObjectDetailsModal
          object={selectedObject}
          tasks={getObjectTasks(selectedObject.id)}
          onClose={() => setSelectedObject(null)}
          onSelectTask={handleSelectTask}
        />
      )}

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          objectName={
            objects.find((object) => object.id === selectedTask.object_id)
              ?.name ?? "Unknown object"
          }
          objectAddress={
            objects.find((object) => object.id === selectedTask.object_id)
              ?.address ?? ""
          }
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}