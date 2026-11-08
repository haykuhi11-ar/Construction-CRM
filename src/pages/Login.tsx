import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Authenticate user
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw loginError;
      }

      if (!data.user) {
        throw new Error("User not found.");
      }

      // 2. Load user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error("Could not load user profile.");
      }

      // 3. Check account status
      if (!profile.is_active) {
        await supabase.auth.signOut();
        throw new Error("Your account has been deactivated.");
      }

      // 4. Redirect according to role
      if (profile.role === "manager") {
        navigate("/manager/dashboard", { replace: true });
        return;
      }

      if (profile.role === "executor") {
        navigate("/executor/dashboard", { replace: true });
        return;
      }

      // 5. Reject unknown roles
      await supabase.auth.signOut();
      throw new Error("Your account does not have a valid role.");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F3F5] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E7EC] bg-white p-8 shadow-lg">

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#536B82] text-2xl font-bold text-white">
            C
          </div>

          <h1 className="text-2xl font-bold text-[#263445]">
            ConstructPro
          </h1>

          <p className="mt-2 text-sm text-[#8491A0]">
            Construction Management System
          </p>
        </div>

        {/* Heading */}
        <div className="mb-7">
          <h2 className="text-xl font-semibold text-[#263445]">
            Welcome back
          </h2>

          <p className="mt-1 text-sm text-[#8491A0]">
            Sign in to access your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">

          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Email address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="username"
              className="w-full rounded-lg border border-[#E2E7EC] px-4 py-3 text-sm outline-none transition focus:border-[#536B82] focus:ring-2 focus:ring-[#536B82]/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#263445]">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-[#E2E7EC] px-4 py-3 pr-16 text-sm outline-none transition focus:border-[#536B82] focus:ring-2 focus:ring-[#536B82]/10"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-[#536B82]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#536B82] py-3 font-medium text-white transition hover:bg-[#40576D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 border-t border-[#E2E7EC] pt-5 text-center">
          <p className="text-xs text-[#8491A0]">
            Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
}