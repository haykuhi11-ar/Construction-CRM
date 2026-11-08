import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import StatCard from "../../components/StatCard";
import AddObjectModal from "../../components/AddObjectModal";
import ObjectDetailsModal from "../../components/ObjectDetailsModal";
import type { Task } from "../../components/TaskDetailModal";

interface ConstructionObject {
  id: string;
  name: string;
  address: string | null;
  is_archived: boolean;
}

type ObjectFilter = "all" | "active" | "archived";

export default function Objects() {
  const navigate = useNavigate();

  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ObjectFilter>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedObject, setSelectedObject] =
    useState<ConstructionObject | null>(null);

  async function loadObjects() {
    setLoading(true);
    setError(null);

    try {
      const [objectsResult, tasksResult] = await Promise.all([
        supabase
          .from("objects")
          .select("id, name, address, is_archived")
          .order("name"),

        supabase
          .from("tasks")
          .select(
            "id, title, description, object_id, status, created_at, updated_at"
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
      ]);

      if (objectsResult.error) throw objectsResult.error;
      if (tasksResult.error) throw tasksResult.error;

      setObjects(objectsResult.data ?? []);
      setTasks(tasksResult.data ?? []);
    } catch (err) {
      console.error("Objects loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load objects."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadObjects();
  }, []);

  const filteredObjects = useMemo(() => {
    return objects.filter((object) => {
      const matchesSearch = object.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !object.is_archived) ||
        (statusFilter === "archived" && object.is_archived);

      return matchesSearch && matchesStatus;
    });
  }, [objects, search, statusFilter]);

  const activeCount = objects.filter(
    (object) => !object.is_archived
  ).length;

  const archivedCount = objects.length - activeCount;

  function handleSelectTask(task: Task) {
    navigate(`/manager/tasks/${task.id}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#263445]">
            Objects
          </h2>

          <p className="mt-1 text-sm text-[#8491A0]">
            Manage your construction projects and locations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-[#536B82] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#40576D] hover:shadow-md"
        >
          + Add Object
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Objects"
          value={objects.length}
          description="All registered objects"
          icon="🏗️"
          accent="bg-blue-50"
          loading={loading}
        />

        <StatCard
          title="Active Objects"
          value={activeCount}
          description="Currently active projects"
          icon="✓"
          accent="bg-green-50"
          loading={loading}
        />

        <StatCard
          title="Archived Objects"
          value={archivedCount}
          description="Completed or archived projects"
          icon="📁"
          accent="bg-orange-50"
          loading={loading}
        />
      </div>

      {/* Objects List */}
      <div className="rounded-2xl border border-[#E2E7EC] bg-white p-5 shadow-sm">
        {/* Filters */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search objects..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none transition focus:border-[#536B82]"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as ObjectFilter)
            }
            className="rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none transition focus:border-[#536B82]"
          >
            <option value="all">All Objects</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading / Empty / Table */}
        {loading ? (
          <p className="py-10 text-center text-sm text-[#8491A0]">
            Loading objects...
          </p>
        ) : error ? null : filteredObjects.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-3 text-4xl">🏗️</div>

            <p className="font-medium text-[#263445]">
              No objects found
            </p>

            <p className="mt-1 text-sm text-[#8491A0]">
              Your construction objects will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead>
                <tr className="border-b border-[#E2E7EC] text-xs text-[#8491A0]">
                  <th className="pb-3 font-medium">Object</th>
                  <th className="pb-3 font-medium">Object ID</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredObjects.map((object) => (
                  <tr
                    key={object.id}
                    className="border-b border-[#E2E7EC] last:border-0 transition hover:bg-gray-50/70"
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0F5] text-lg">
                          🏗️
                        </div>

                        <div>
                          <p className="text-sm font-medium text-[#263445]">
                            {object.name}
                          </p>

                          <p className="mt-0.5 text-xs text-[#8491A0]">
                            {object.address || "No address"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 text-sm text-[#8491A0]">
                      {object.id.slice(0, 8)}
                    </td>

                    <td className="py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          object.is_archived
                            ? "bg-gray-100 text-gray-600"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {object.is_archived ? "Archived" : "Active"}
                      </span>
                    </td>

                    <td className="py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedObject(object)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#D8E1E9] bg-white px-4 py-2 text-sm font-medium text-[#536B82] shadow-sm transition hover:border-[#536B82] hover:bg-[#F0F4F7] hover:text-[#40576D] focus:outline-none focus:ring-2 focus:ring-[#536B82]/20"
                      >
                        <span>View</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Object Modal */}
      <AddObjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={loadObjects}
            />

            {/* Object Details Modal */}
            {selectedObject && (
                <ObjectDetailsModal
                    object={selectedObject}
                    tasks={tasks.filter(
                        (task) => task.object_id === selectedObject.id
                    )}
                    onClose={() => setSelectedObject(null)}
                    onSelectTask={handleSelectTask}
                />
            )}
        </div>
    );
}