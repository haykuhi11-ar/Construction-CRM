import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../services/supabase";

interface AddObjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

export default function AddObjectModal({
  isOpen,
  onClose,
  onCreated,
}: AddObjectModalProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setAddress("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      setError("Object name is required.");
      return;
    }

    if (!trimmedAddress) {
      setError("Object address is required.");
      return;
    }

    setSaving(true);

    try {
      const { error: insertError } = await supabase
        .from("objects")
        .insert({
          name: trimmedName,
          address: trimmedAddress,
        });

      if (insertError) throw insertError;

      await onCreated();
      onClose();
    } catch (err) {
      console.error("Object creation error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create object."
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
              Add New Object
            </h2>

            <p className="mt-1 text-sm text-[#8491A0]">
              Enter construction object details.
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

          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Object Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter object name"
              disabled={saving}
              className="w-full rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none transition focus:border-[#536B82]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Address
            </label>

            <input
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Enter object address"
              disabled={saving}
              className="w-full rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none transition focus:border-[#536B82]"
            />
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
              {saving ? "Creating..." : "Create Object"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}