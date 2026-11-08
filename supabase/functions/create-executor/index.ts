// supabase/functions/create-executor/index.ts
// Создаёт аккаунт исполнителя. Вызывать может только активный менеджер.
// Профиль создаётся триггером on_auth_user_created с ролью 'executor'.

import { createClient } from "npm:@supabase/supabase-js@2";

// Платформа кладёт ключи в переменные как JSON-словарь: {"default":"sb_..."}.
// Если проект ещё на старых ключах, берём legacy-переменную.
function readKey(dictName: string, legacyName: string): string | undefined {
  const raw = Deno.env.get(dictName)?.trim();

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.default === "string" && parsed.default.trim()) {
        return parsed.default.trim();
      }
    } catch {
      return raw; // не JSON: считаем, что это сам ключ
    }
  }

  return Deno.env.get(legacyName)?.trim() || undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  // CORS: отражаем заголовки, которые запросил браузер
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      req.headers.get("Access-Control-Request-Headers") ??
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    // 0. Переменные окружения
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const publishableKey = readKey(
      "SUPABASE_PUBLISHABLE_KEYS",
      "SUPABASE_ANON_KEY",
    );
    const secretKey = readKey(
      "SUPABASE_SECRET_KEYS",
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !publishableKey || !secretKey) {
      console.error("Missing env:", {
        SUPABASE_URL: !!supabaseUrl,
        publishableKey: !!publishableKey,
        secretKey: !!secretKey,
      });
      return json({ error: "Server environment variables are missing." }, 500);
    }

    // 1. Токен вошедшего пользователя
    const match = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return json({ error: "Unauthorized." }, 401);
    }

    const token = match[1].trim();

    // 2. Проверяем сессию
    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return json({ error: "Invalid session." }, 401);
    }

    // 3. Админ-клиент (обходит RLS, только на сервере)
    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4. Проверяем, что вызывающий: активный менеджер
    const { data: manager, error: managerError } = await adminClient
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (managerError) {
      console.error("Manager profile query error:", managerError);
      return json(
        {
          error: "Could not verify manager profile.",
          details: managerError.message,
          code: managerError.code,
        },
        500,
      );
    }

    if (!manager) {
      return json({ error: "Manager profile not found." }, 403);
    }

    if (manager.role !== "manager" || !manager.is_active) {
      return json({ error: "Only active managers can create executors." }, 403);
    }

    // 5. Валидация тела запроса
    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return json({ error: "Request body must be valid JSON." }, 400);
    }

    const fullName = typeof body.full_name === "string"
      ? body.full_name.trim()
      : "";
    const email = typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!fullName || !email || !password) {
      return json(
        { error: "Full name, email and password are required." },
        400,
      );
    }

    if (fullName.length > 200) {
      return json({ error: "Full name is too long (max 200)." }, 400);
    }

    if (!EMAIL_RE.test(email)) {
      return json({ error: "Invalid email address." }, 400);
    }

    if (password.length < 8) {
      return json(
        { error: "Password must contain at least 8 characters." },
        400,
      );
    }

    // 6. Создаём аккаунт. Роль не передаём: триггер всегда ставит 'executor'.
    const { data: created, error: createError } = await adminClient.auth.admin
      .createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createError || !created?.user) {
      console.error("createUser error:", createError);

      const alreadyExists = createError?.status === 422 ||
        (createError as { code?: string } | null)?.code === "email_exists";

      return json(
        { error: createError?.message ?? "Could not create user." },
        alreadyExists ? 409 : 400,
      );
    }

    return json(
      {
        message: "Executor created successfully.",
        user: {
          id: created.user.id,
          email: created.user.email,
          full_name: fullName,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Create executor error:", error);

    return json(
      {
        error: error instanceof Error
          ? error.message
          : "Internal server error.",
      },
      500,
    );
  }
});