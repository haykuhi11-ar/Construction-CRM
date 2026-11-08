import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

type ProfileData = {
  id: string;
  full_name: string;
  role: "manager" | "executor";
  is_active: boolean;
  created_at: string;
};

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("User not authenticated.");

      setEmail(user.email ?? "");

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, is_active, created_at")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const profileData = data as ProfileData;

      setProfile(profileData);
      setFullName(profileData.full_name);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load profile."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
        })
        .eq("id", profile?.id);

      if (updateError) throw updateError;

      setMessage("Profile updated successfully.");
      await loadProfile();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setChangingPassword(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setPasswordMessage("Password changed successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-slate-400">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-5">
        <p className="text-sm text-red-600">
          {error || "Profile not found."}
        </p>
        <button
          onClick={loadProfile}
          className="mt-3 text-sm font-medium text-red-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const initials = profile.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">My Profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage your personal information and account security.
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-100 text-2xl font-bold text-orange-600">
            {initials || "E"}
          </div>

          <div className="text-center sm:text-left">
            <h3 className="text-xl font-bold text-slate-800">
              {profile.full_name}
            </h3>

            <p className="mt-1 text-sm text-slate-400">{email}</p>

            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                Executor
              </span>

              <span
                className={`rounded-lg px-3 py-1 text-xs font-medium ${
                  profile.is_active
                    ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {profile.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* General messages */}
      {(message || error) && (
        <div
          className={`rounded-xl p-4 text-sm ${
            error
              ? "border border-red-100 bg-red-50 text-red-600"
              : "border border-green-100 bg-green-50 text-green-600"
          }`}
        >
          {error || message}
        </div>
      )}

      {/* Personal information */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-800">
            Personal Information
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Update your profile information.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Email Address
            </label>

            <input
              type="email"
              value={email}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-400"
            />

            <p className="mt-1 text-xs text-slate-400">
              Contact your manager if you need to change your email.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Role
            </label>

            <input
              type="text"
              value="Executor"
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-400"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-gray-100 pt-5">
          <button
            type="submit"
            disabled={saving || !profile.is_active}
            className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Account details */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">
          Account Details
        </h3>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-400">Account Created</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">User ID</p>
            <p className="mt-1 break-all text-sm font-medium text-slate-700">
              {profile.id}
            </p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <form
        onSubmit={handleChangePassword}
        className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-800">
            Change Password
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Choose a strong password for your account.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              New Password
            </label>

            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Confirm New Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
              placeholder="Repeat your new password"
            />
          </div>
        </div>

        {(passwordMessage || passwordError) && (
          <div
            className={`mt-4 rounded-xl p-3 text-sm ${
              passwordError
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-600"
            }`}
          >
            {passwordError || passwordMessage}
          </div>
        )}

        <div className="mt-6 flex justify-end border-t border-gray-100 pt-5">
          <button
            type="submit"
            disabled={
              changingPassword ||
              !newPassword ||
              !confirmPassword ||
              !profile.is_active
            }
            className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}