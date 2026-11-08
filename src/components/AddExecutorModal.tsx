import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../services/supabase";

interface AddExecutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

export default function AddExecutorModal({
  isOpen,
  onClose,
  onCreated,
}: AddExecutorModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFullName("");
      setEmail("");
      setPassword("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setSaving(true);

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke("create-executor", {
          body: {
            full_name: trimmedName,
            email: trimmedEmail,
            password,
          },
        });

      if (functionError) throw functionError;

      if (data?.error) {
        throw new Error(data.error);
      }

      await onCreated();
      onClose();
    } catch (err) {
      console.error("Executor creation error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create executor."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#263445]">
              Add New Executor
            </h2>

            <p className="mt-1 text-sm text-[#8491A0]">
              Create an account for a new executor.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-2xl text-[#8491A0] transition hover:text-[#263445] disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Full Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter full name"
              disabled={saving}
              className="w-full rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none transition focus:border-[#536B82]"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="executor@example.com"
              disabled={saving}
              className="w-full rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none transition focus:border-[#536B82]"
            />
          </div>

          {/* Temporary Password */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Temporary Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter temporary password"
              disabled={saving}
              className="w-full rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none transition focus:border-[#536B82]"
            />

            <p className="mt-2 text-xs text-[#8491A0]">
              The executor will use these credentials to log in.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[#E2E7EC] px-5 py-3 text-sm font-medium text-[#536B82] transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#536B82] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#40576D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Executor"}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}