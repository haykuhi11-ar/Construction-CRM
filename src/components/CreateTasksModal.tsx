import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

interface ConstructionObject {
  id: string;
  name: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onCreated,
}: CreateTaskModalProps) {
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectId, setObjectId] = useState("");

  const [loadingObjects, setLoadingObjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    async function loadObjects() {
      setLoadingObjects(true);
      setError("");

      const { data, error } = await supabase
        .from("objects")
        .select("id, name")
        .eq("is_archived", false)
        .order("name");

      if (error) {
        setError(error.message);
      } else {
        setObjects(data ?? []);
      }

      setLoadingObjects(false);
    }

    loadObjects();
  }, [isOpen]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setObjectId("");
    setError("");
  }

  function handleClose() {
    if (saving) return;

    resetForm();
    onClose();
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (!objectId) {
      setError("Please select a construction object.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.rpc("create_task", {
        p_title: title.trim(),
        p_description: description.trim() || null,
        p_object_id: objectId,
      });

      if (error) throw error;

      resetForm();
      onClose();
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create task."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#263445]/40 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[#263445]">
              Create New Task
            </h3>

            <p className="mt-1 text-sm text-[#8491A0]">
              Add a new construction task.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="text-2xl text-[#8491A0] hover:text-[#263445]"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Task Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
              placeholder="Enter task title"
              className="w-full rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none focus:border-[#536B82]"
            />

            <p className="mt-1 text-right text-xs text-[#8491A0]">
              {title.length}/200
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
              rows={4}
              placeholder="Describe the task..."
              className="w-full resize-none rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none focus:border-[#536B82]"
            />

            <p className="mt-1 text-right text-xs text-[#8491A0]">
              {description.length}/5000
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Construction Object
            </label>

            <select
              value={objectId}
              onChange={(event) => setObjectId(event.target.value)}
              required
              disabled={loadingObjects || objects.length === 0}
              className="w-full rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none focus:border-[#536B82] disabled:bg-gray-50"
            >
              <option value="">
                {loadingObjects
                  ? "Loading objects..."
                  : "Select an object"}
              </option>

              {objects.map((object) => (
                <option key={object.id} value={object.id}>
                  {object.name}
                </option>
              ))}
            </select>

            {!loadingObjects && objects.length === 0 && (
              <p className="mt-2 text-xs text-orange-600">
                No active objects available. Create an object first.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-xl border border-[#E2E7EC] px-5 py-3 text-sm font-medium text-[#536B82] hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || loadingObjects || objects.length === 0}
              className="rounded-xl bg-[#536B82] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#40576D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Task"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}