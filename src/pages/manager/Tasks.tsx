import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import StatCard from "../../components/StatCard";
import CreateTaskModal from "../../components/CreateTasksModal";

type TaskStatus =
    | "new"
    | "in_progress"
    | "under_review"
    | "revision"
    | "accepted";

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    created_at: string;
    updated_at: string;
    object_id: string;
    assignee_id: string | null;
}

interface ConstructionObject {
    id: string;
    name: string;
    address: string | null;
}

interface Executor {
    id: string;
    full_name: string;
}

type StatusFilter = "all" | TaskStatus;
type AssignmentFilter = "all" | "assigned" | "unassigned";

export default function Tasks() {
    const navigate = useNavigate();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [objects, setObjects] = useState<ConstructionObject[]>([]);
    const [executors, setExecutors] = useState<Executor[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");

    const [statusFilter, setStatusFilter] =
        useState<StatusFilter>("all");

    const [assignmentFilter, setAssignmentFilter] =
        useState<AssignmentFilter>("all");

    const [isModalOpen, setIsModalOpen] = useState(false);

    // Load tasks, objects and executors
    async function loadData() {
        setLoading(true);
        setError(null);

        try {
            const [
                { data: taskData, error: taskError },
                { data: objectData, error: objectError },
                { data: executorData, error: executorError },
            ] = await Promise.all([
                supabase
                    .from("tasks")
                    .select(
                        "id, title, description, status, created_at, updated_at, object_id, assignee_id"
                    )
                    .is("deleted_at", null)
                    .order("created_at", { ascending: false }),

                supabase
                    .from("objects")
                    .select("id, name, address")
                    .eq("is_archived", false)
                    .order("name"),

                supabase
                    .from("profiles")
                    .select("id, full_name")
                    .eq("role", "executor")
                    .eq("is_active", true)
                    .order("full_name"),
            ]);

            if (taskError) throw taskError;
            if (objectError) throw objectError;
            if (executorError) throw executorError;

            setTasks((taskData ?? []) as Task[]);
            setObjects(objectData ?? []);
            setExecutors(executorData ?? []);
        } catch (err) {
            console.error("Tasks loading error:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load data"
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    // Object map
    const objectMap = useMemo(
        () =>
            new Map(
                objects.map((object) => [object.id, object])
            ),
        [objects]
    );

    // Executor map
    const executorMap = useMemo(
        () =>
            new Map(
                executors.map((executor) => [
                    executor.id,
                    executor.full_name,
                ])
            ),
        [executors]
    );

    // Filtering
    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            const objectName =
                objectMap.get(task.object_id)?.name ?? "";

            const executorName = task.assignee_id
                ? executorMap.get(task.assignee_id) ?? ""
                : "";

            const searchValue = search.toLowerCase();

            const matchesSearch =
                task.title.toLowerCase().includes(searchValue) ||
                objectName.toLowerCase().includes(searchValue) ||
                executorName.toLowerCase().includes(searchValue);

            const matchesStatus =
                statusFilter === "all" ||
                task.status === statusFilter;

            const matchesAssignment =
                assignmentFilter === "all" ||
                (assignmentFilter === "assigned" &&
                    task.assignee_id !== null) ||
                (assignmentFilter === "unassigned" &&
                    task.assignee_id === null);

            return (
                matchesSearch &&
                matchesStatus &&
                matchesAssignment
            );
        });
    }, [
        tasks,
        objectMap,
        executorMap,
        search,
        statusFilter,
        assignmentFilter,
    ]);

    // Statistics
    const assignedCount = tasks.filter(
        (task) => task.assignee_id !== null
    ).length;

    const unassignedCount = tasks.length - assignedCount;

    const underReviewCount = tasks.filter(
        (task) => task.status === "under_review"
    ).length;

    // Status styles
    const getStatusStyle = (status: TaskStatus) => {
        switch (status) {
            case "new":
                return "bg-blue-50 text-blue-700";

            case "in_progress":
                return "bg-orange-50 text-orange-700";

            case "under_review":
                return "bg-purple-50 text-purple-700";

            case "revision":
                return "bg-red-50 text-red-700";

            case "accepted":
                return "bg-green-50 text-green-700";

            default:
                return "bg-gray-100 text-gray-600";
        }
    };

    const formatStatus = (status: TaskStatus) =>
        status.replaceAll("_", " ");

    // Open separate task details page
    const openTaskDetails = (taskId: string) => {
        navigate(`/manager/tasks/${taskId}`);
    };

    return (
        <div className="space-y-6">

            {/* Page Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-[#263445]">
                        All Tasks
                    </h2>

                    <p className="mt-1 text-sm text-[#8491A0]">
                        Monitor and manage all construction tasks.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-xl bg-[#536B82] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#40576D]"
                >
                    + Create Task
                </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Tasks"
                    value={tasks.length}
                    description="All registered tasks"
                    icon="📋"
                    accent="bg-blue-50"
                    loading={loading}
                />

                <StatCard
                    title="Assigned"
                    value={assignedCount}
                    description="Tasks assigned to executors"
                    icon="👷"
                    accent="bg-green-50"
                    loading={loading}
                />

                <StatCard
                    title="Unassigned"
                    value={unassignedCount}
                    description="Waiting for assignment"
                    icon="📌"
                    accent="bg-orange-50"
                    loading={loading}
                />

                <StatCard
                    title="Under Review"
                    value={underReviewCount}
                    description="Waiting for manager review"
                    icon="🔍"
                    accent="bg-purple-50"
                    loading={loading}
                />
            </div>

            {/* Tasks Table */}
            <div className="rounded-2xl border border-[#E2E7EC] bg-white p-5 shadow-sm">

                {/* Filters */}
                <div className="mb-5 flex flex-col gap-3 lg:flex-row">
                    <input
                        type="text"
                        placeholder="Search tasks, objects or executors..."
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        className="w-full rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none focus:border-[#536B82]"
                    />

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value as StatusFilter
                            )
                        }
                        className="rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none focus:border-[#536B82]"
                    >
                        <option value="all">All Statuses</option>
                        <option value="new">New</option>
                        <option value="in_progress">In Progress</option>
                        <option value="under_review">Under Review</option>
                        <option value="revision">Revision</option>
                        <option value="accepted">Accepted</option>
                    </select>

                    <select
                        value={assignmentFilter}
                        onChange={(event) =>
                            setAssignmentFilter(
                                event.target.value as AssignmentFilter
                            )
                        }
                        className="rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none focus:border-[#536B82]"
                    >
                        <option value="all">All Tasks</option>
                        <option value="assigned">Assigned</option>
                        <option value="unassigned">Unassigned</option>
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
                        Loading tasks...
                    </p>
                ) : error ? null : filteredTasks.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="mb-3 text-4xl">📋</div>

                        <p className="font-medium text-[#263445]">
                            No tasks found
                        </p>

                        <p className="mt-1 text-sm text-[#8491A0]">
                            Try changing your search or filters.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] text-left">
                            <thead>
                                <tr className="border-b border-[#E2E7EC] text-xs text-[#8491A0]">
                                    <th className="pb-3 font-medium">Task</th>
                                    <th className="pb-3 font-medium">Object</th>
                                    <th className="pb-3 font-medium">Executor</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 font-medium">Created</th>
                                    <th className="pb-3 font-medium">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        className="border-b border-[#E2E7EC] last:border-0"
                                    >
                                        <td className="py-4 pr-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openTaskDetails(task.id)
                                                }
                                                className="text-left text-sm font-medium text-[#263445] transition hover:text-[#536B82] hover:underline"
                                            >
                                                {task.title}
                                            </button>
                                        </td>

                                        <td className="py-4 text-sm text-[#536B82]">
                                            {objectMap.get(task.object_id)?.name ??
                                                "Unknown object"}
                                        </td>

                                        <td className="py-4">
                                            {task.assignee_id ? (
                                                <span className="text-sm text-[#263445]">
                                                    {executorMap.get(task.assignee_id) ??
                                                        "Unknown executor"}
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                                                    Unassigned
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-4">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusStyle(task.status)}`}
                                            >
                                                {formatStatus(task.status)}
                                            </span>
                                        </td>

                                        <td className="py-4 text-sm text-[#8491A0]">
                                            {new Date(
                                                task.created_at
                                            ).toLocaleDateString()}
                                        </td>

                                        <td className="py-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openTaskDetails(task.id)
                                                }
                                                className="inline-flex items-center gap-2 rounded-lg border border-[#DCE3EA] bg-white px-4 py-2 text-xs font-semibold text-[#536B82] shadow-sm transition-all hover:border-[#536B82] hover:bg-[#536B82] hover:text-white active:scale-95"
                                            >
                                                View
                                                <span aria-hidden="true">
                                                    →
                                                </span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Task Modal */}
            <CreateTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={loadData}
            />
        </div>
    );
}