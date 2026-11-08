import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../services/supabase";

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
  assignee_id: string | null;
  manager_id: string | null;
  created_by: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
};

type ObjectItem = {
  id: string;
  name: string;
  address: string | null;
};

type Profile = {
  id: string;
  full_name: string;
  role: "manager" | "executor";
};

type TaskHistoryItem = {
  id: string;
  changed_by: string | null;
  old_status: TaskStatus | null;
  new_status: TaskStatus;
  comment: string | null;
  created_at: string;
};

type AssignmentHistoryItem = {
  id: string;
  previous_assignee_id: string | null;
  new_assignee_id: string;
  changed_by: string;
  created_at: string;
};

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

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";

  return new Date(value).toLocaleString();
};

export default function TaskDetails() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [object, setObject] = useState<ObjectItem | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<
    AssignmentHistoryItem[]
  >([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionComment, setRevisionComment] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadTaskDetails = useCallback(async () => {
    if (!taskId) {
      setError("Task ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("You must be authenticated to view this task.");
      }

      setCurrentUserId(user.id);

      // Load task
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select(
          "id, title, description, object_id, assignee_id, manager_id, created_by, status, created_at, updated_at"
        )
        .eq("id", taskId)
        .is("deleted_at", null)
        .single();

      if (taskError) throw taskError;

      const loadedTask = taskData as Task;
      setTask(loadedTask);

      // Load related information
      const [
        { data: objectData, error: objectError },
        { data: historyData, error: historyError },
        { data: assignmentData, error: assignmentError },
      ] = await Promise.all([
        supabase
          .from("objects")
          .select("id, name, address")
          .eq("id", loadedTask.object_id)
          .single(),

        supabase
          .from("task_history")
          .select(
            "id, changed_by, old_status, new_status, comment, created_at"
          )
          .eq("task_id", taskId)
          .order("created_at", { ascending: false }),

        supabase
          .from("task_assignment_history")
          .select(
            "id, previous_assignee_id, new_assignee_id, changed_by, created_at"
          )
          .eq("task_id", taskId)
          .order("created_at", { ascending: false }),
      ]);

      if (objectError) throw objectError;
      if (historyError) throw historyError;
      if (assignmentError) throw assignmentError;

      const loadedHistory = (historyData ?? []) as TaskHistoryItem[];
      const loadedAssignments =
        (assignmentData ?? []) as AssignmentHistoryItem[];

      setObject(objectData as ObjectItem);
      setHistory(loadedHistory);
      setAssignmentHistory(loadedAssignments);

      // Collect profile IDs used on this page
      const profileIds = [
        loadedTask.created_by,
        loadedTask.manager_id,
        loadedTask.assignee_id,
        ...loadedHistory.map((item) => item.changed_by),
        ...loadedAssignments.flatMap((item) => [
          item.previous_assignee_id,
          item.new_assignee_id,
          item.changed_by,
        ]),
      ].filter((id): id is string => Boolean(id));

      const uniqueProfileIds = [...new Set(profileIds)];

      if (uniqueProfileIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", uniqueProfileIds);

        if (profilesError) throw profilesError;

        setProfiles((profilesData ?? []) as Profile[]);
      } else {
        setProfiles([]);
      }
    } catch (err) {
      console.error("Task details loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load task details."
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTaskDetails();
  }, [loadTaskDetails]);

  const getProfileName = (profileId: string | null) => {
    if (!profileId) return "Not assigned";

    return (
      profiles.find((profile) => profile.id === profileId)?.full_name ??
      "Unknown user"
    );
  };

  const canManageTask =
    Boolean(task && currentUserId) &&
    (task?.manager_id === currentUserId ||
      (task?.manager_id === null && task?.assignee_id === null));

  const reviewSubmission = history.find(
    (item) => item.new_status === "under_review"
  );

  const latestAssignment = assignmentHistory[0];

  const handleAccept = async () => {
    if (!task) return;

    setUpdatingStatus(true);
    setActionError("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "change_task_status",
        {
          p_task_id: task.id,
          p_new_status: "accepted",
          p_comment: null,
        }
      );

      if (rpcError) throw rpcError;

      await loadTaskDetails();
    } catch (err) {
      console.error("Task acceptance error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to accept task."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRevision = async () => {
    if (!task) return;

    const comment = revisionComment.trim();

    if (!comment) {
      setActionError("Please enter a comment explaining the required changes.");
      return;
    }

    if (comment.length > 1000) {
      setActionError("Comment cannot exceed 1000 characters.");
      return;
    }

    setUpdatingStatus(true);
    setActionError("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "change_task_status",
        {
          p_task_id: task.id,
          p_new_status: "revision",
          p_comment: comment,
        }
      );

      if (rpcError) throw rpcError;

      setRevisionComment("");
      setShowRevisionForm(false);

      await loadTaskDetails();
    } catch (err) {
      console.error("Task revision error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to return task for revision."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-slate-400">
        Loading task details...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
        <p className="text-red-600">
          {error || "Task not found."}
        </p>

        <button
          type="button"
          onClick={() => navigate("/manager/tasks")}
          className="mt-4 text-sm font-semibold text-red-700 underline"
        >
          Back to tasks
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/manager/tasks")}
            className="mb-3 text-sm font-medium text-slate-500 transition hover:text-orange-500"
          >
            ← Back to tasks
          </button>

          <h1 className="text-2xl font-bold text-slate-800">
            Task Details
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Full information, assignment and task history.
          </p>
        </div>

        <span
          className={`w-fit rounded-xl px-4 py-2 text-sm font-semibold ${statusStyles[task.status]}`}
        >
          {statusLabels[task.status]}
        </span>
      </div>

      {/* Main task information */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">
          {task.title}
        </h2>

        <div className="mt-5">
          <p className="text-sm font-medium text-slate-500">
            Description
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {task.description || "No description provided."}
          </p>
        </div>

        <div className="mt-6 grid gap-5 border-t border-gray-100 pt-5 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-400">Created</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {formatDate(task.created_at)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Last updated</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {formatDate(task.updated_at)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Created by</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {getProfileName(task.created_by)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">Responsible manager</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {getProfileName(task.manager_id)}
            </p>
          </div>
        </div>
      </div>

      {/* Object and executor */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800">
            Object Location
          </h3>

          <p className="mt-4 text-lg font-semibold text-slate-700">
            {object?.name ?? "Unknown object"}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {object?.address || "No address provided"}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800">
            Executor
          </h3>

          <p className="mt-4 text-lg font-semibold text-slate-700">
            {getProfileName(task.assignee_id)}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {latestAssignment
              ? `Latest assignment: ${formatDate(latestAssignment.created_at)}`
              : "Assignment date unavailable"}
          </p>
        </div>
      </div>

      {/* Review information */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-800">
          Review Information
        </h3>

        <div className="mt-4">
          <p className="text-xs text-slate-400">
            Latest submission for review
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            {reviewSubmission
              ? formatDate(reviewSubmission.created_at)
              : "Not submitted for review yet"}
          </p>
        </div>
      </div>

      {/* Status actions */}
      {canManageTask && task.status === "under_review" && (
        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">
            Review Task
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Check the completed work and choose the next action.
          </p>

          {actionError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {actionError}
            </div>
          )}

          {!showRevisionForm ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={updatingStatus}
                onClick={handleAccept}
                className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {updatingStatus ? "Processing..." : "Accept Task"}
              </button>

              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => {
                  setActionError("");
                  setShowRevisionForm(true);
                }}
                className="rounded-xl bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                Request Revision
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="revision-comment"
                    className="text-sm font-medium text-slate-700"
                  >
                    Reason for revision *
                  </label>

                  <span className="text-xs text-slate-400">
                    {revisionComment.length}/1000
                  </span>
                </div>

                <textarea
                  id="revision-comment"
                  value={revisionComment}
                  onChange={(event) =>
                    setRevisionComment(event.target.value.slice(0, 1000))
                  }
                  maxLength={1000}
                  rows={4}
                  placeholder="Explain what the executor needs to correct..."
                  className="mt-2 w-full resize-y rounded-xl border border-gray-200 p-4 text-sm outline-none transition focus:border-orange-400"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={updatingStatus || !revisionComment.trim()}
                  onClick={handleRevision}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updatingStatus ? "Sending..." : "Send Revision"}
                </button>

                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => {
                    setShowRevisionForm(false);
                    setRevisionComment("");
                    setActionError("");
                  }}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Read-only notice */}
      {!canManageTask && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          You can view this task, but only its responsible manager can change
          its status.
        </div>
      )}

      {canManageTask && task.status !== "under_review" && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-slate-500">
          {task.status === "accepted"
            ? "This task has been accepted."
            : "There are no manager review actions available for the current task status."}
        </div>
      )}

      {/* Status history */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">
          Status History
        </h3>

        {history.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            No status history available.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            {history.map((item) => (
              <div
                key={item.id}
                className="relative border-l-2 border-gray-100 pb-2 pl-5 last:pb-0"
              >
                <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-orange-400" />

                <p className="text-sm font-semibold text-slate-700">
                  {item.old_status
                    ? `${statusLabels[item.old_status]} → ${statusLabels[item.new_status]}`
                    : `Task created: ${statusLabels[item.new_status]}`}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {formatDate(item.created_at)}
                  {" · "}
                  {getProfileName(item.changed_by)}
                </p>

                {item.comment && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    {item.comment}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment history */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">
          Assignment History
        </h3>

        {assignmentHistory.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            No assignment history available.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {assignmentHistory.map((item) => (
              <div
                key={item.id}
                className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
              >
                <p className="text-sm font-medium text-slate-700">
                  {item.previous_assignee_id
                    ? `${getProfileName(item.previous_assignee_id)} → ${getProfileName(item.new_assignee_id)}`
                    : `Assigned to ${getProfileName(item.new_assignee_id)}`}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {formatDate(item.created_at)}
                  {" · Changed by "}
                  {getProfileName(item.changed_by)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}