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

interface ObjectDetailsModalProps {
  object: ObjectItem;
  tasks: Task[];
  onClose: () => void;
  onSelectTask: (task: Task) => void;
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

export default function ObjectDetailsModal({
  object,
  tasks,
  onClose,
  onSelectTask,
}: ObjectDetailsModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
              Object Details
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-800">
              {object.name}
            </h2>

            {object.is_archived && (
              <span className="mt-2 inline-block rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                Archived
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Information */}
          <section className="rounded-xl bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-800">
              Object Information
            </h3>

            <div className="mt-4">
              <p className="text-xs text-slate-400">Object Name</p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {object.name}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-400">Address</p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {object.address || "No address provided"}
              </p>
            </div>
          </section>

          {/* Tasks */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Tasks on this object
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Tasks assigned to you
                </p>
              </div>

              <span className="rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-600">
                {tasks.length} tasks
              </span>
            </div>

            {tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm text-slate-500">
                  No tasks on this object.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="flex w-full flex-col gap-3 rounded-xl border border-gray-100 p-4 text-left transition hover:border-orange-200 hover:bg-orange-50/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {task.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Updated:{" "}
                        {new Date(task.updated_at).toLocaleDateString()}
                      </p>
                    </div>

                    <span
                      className={`w-fit shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${statusStyles[task.status]}`}
                    >
                      {statusLabels[task.status]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end border-t border-gray-100 p-6">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}