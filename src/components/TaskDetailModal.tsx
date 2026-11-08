import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export type TaskStatus =
  | "new"
  | "in_progress"
  | "under_review"
  | "accepted"
  | "revision";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  object_id: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

interface HistoryItem {
  id: string;
  changed_by: string;
  old_status: TaskStatus | null;
  new_status: TaskStatus;
  comment: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
}

interface TaskDetailsModalProps {
  task: Task;
  objectName: string;
  objectAddress: string;
  onClose: () => void;
}

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

export default function TaskDetailsModal({
  task,
  objectName,
  objectAddress,
  onClose,
}: TaskDetailsModalProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setLoading(true);
      setError(null);

      const { data, error: historyError } = await supabase
        .from("task_history")
        .select(
          "id, changed_by, old_status, new_status, comment, created_at"
        )
        .eq("task_id", task.id)
        .order("created_at", { ascending: false });

      if (historyError) {
        if (isMounted) {
          setError(historyError.message);
          setLoading(false);
        }
        return;
      }

      const historyData = (data ?? []) as HistoryItem[];

      const profileIds = [
        ...new Set(historyData.map((item) => item.changed_by)),
      ];

      let profilesData: Profile[] = [];

      if (profileIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", profileIds);

        if (profilesError) {
          if (isMounted) {
            setError(profilesError.message);
            setLoading(false);
          }
          return;
        }

        profilesData = data ?? [];
      }

      if (isMounted) {
        setHistory(historyData);
        setProfiles(profilesData);
        setLoading(false);
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [task.id]);

  const getProfileName = (profileId: string) =>
    profiles.find((profile) => profile.id === profileId)?.full_name ??
    "User";

  const formatDate = (date: string) =>
    new Date(date).toLocaleString();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 p-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
              Task Details
            </p>

            <h2 className="mt-2 break-words text-xl font-bold text-slate-800">
              {task.title}
            </h2>

            <span
              className={`mt-3 inline-block rounded-lg px-3 py-1.5 text-xs font-medium ${statusStyles[task.status]}`}
            >
              {statusLabels[task.status]}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xl text-slate-400 transition hover:bg-gray-100 hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 p-6">

          {/* Description */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Description
            </h3>

            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-500">
              {task.description || "No description provided."}
            </p>
          </section>

          {/* Object */}
          <section className="rounded-xl bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Object
            </h3>

            <p className="mt-2 text-sm font-medium text-slate-700">
              {objectName}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {objectAddress || "No address provided"}
            </p>
          </section>

          {/* Dates */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">Created</p>

              <p className="mt-1 text-sm font-medium text-slate-700">
                {formatDate(task.created_at)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Last Updated</p>

              <p className="mt-1 text-sm font-medium text-slate-700">
                {formatDate(task.updated_at)}
              </p>
            </div>
          </section>

          {/* History */}
          <section className="border-t border-gray-100 pt-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">
              Comments & History
            </h3>

            {loading ? (
              <p className="text-sm text-slate-400">
                Loading history...
              </p>
            ) : error ? (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-400">
                No history available yet.
              </p>
            ) : (
              <div className="space-y-5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="border-l-2 border-orange-200 pl-4"
                  >
                    <p className="text-sm font-medium text-slate-700">
                      {getProfileName(item.changed_by)}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {item.old_status
                        ? `${statusLabels[item.old_status]} → `
                        : ""}
                      {statusLabels[item.new_status]}
                      {" · "}
                      {formatDate(item.created_at)}
                    </p>

                    {item.comment && (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                        {item.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#536B82] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#40576D]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}