import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

interface ManagerProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<ManagerProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          throw new Error("You are not authenticated.");
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, role, created_at")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        const managerProfile: ManagerProfile = {
          id: data.id,
          full_name: data.full_name ?? "",
          email: user.email ?? "",
          role: data.role,
          created_at: user.created_at,
        };

        setProfile(managerProfile);
        setFullName(managerProfile.full_name);
      } catch (err) {
        console.error("Profile loading error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load profile"
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleSave() {
    if (!profile) return;

    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setError("Name cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: trimmedName })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile({
        ...profile,
        full_name: trimmedName,
      });

      setSuccess("Profile updated successfully.");
    } catch (err) {
      console.error("Profile update error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E2E7EC] bg-white p-10 text-center text-sm text-[#8491A0]">
        Loading profile...
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#263445]">
          My Profile
        </h2>

        <p className="mt-1 text-sm text-[#8491A0]">
          Manage your personal information.
        </p>
      </div>

      {/* Profile Card */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E7EC] bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-[#536B82] to-[#8299AD]" />

        <div className="px-6 pb-6">
          <div className="-mt-12 flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-[#EAF0F5] text-4xl font-bold text-[#536B82]">
            {profile.full_name.charAt(0).toUpperCase() || "M"}
          </div>

          <div className="mt-4">
            <h3 className="text-xl font-bold text-[#263445]">
              {profile.full_name || "Manager"}
            </h3>

            <p className="mt-1 text-sm text-[#8491A0]">
              {profile.email}
            </p>

            <span className="mt-3 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-medium capitalize text-blue-700">
              {profile.role}
            </span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="rounded-2xl border border-[#E2E7EC] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[#263445]">
          Personal Information
        </h3>

        <p className="mt-1 text-sm text-[#8491A0]">
          Update your account information.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-[#E2E7EC] px-4 py-3 text-sm outline-none transition focus:border-[#536B82]"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Email Address
            </label>

            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-[#E2E7EC] bg-gray-50 px-4 py-3 text-sm text-[#8491A0] outline-none"
            />

            <p className="mt-2 text-xs text-[#8491A0]">
              Email cannot be changed from this page.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Account Created
            </label>

            <input
              type="text"
              value={new Date(profile.created_at).toLocaleDateString()}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-[#E2E7EC] bg-gray-50 px-4 py-3 text-sm text-[#8491A0] outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || fullName.trim() === profile.full_name}
            className="rounded-xl bg-[#536B82] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#40576D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}