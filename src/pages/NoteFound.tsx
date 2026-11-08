import { Link, useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F7FA] px-5 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-orange-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-100/60 blur-3xl" />

      <div className="relative w-full max-w-2xl">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl shadow-gray-200/50 sm:p-14">
          
          {/* Logo */}
          <div className="mb-12 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-xl font-bold text-white shadow-lg shadow-orange-200">
              C
            </div>

            <span className="text-xl font-bold tracking-tight text-gray-800">
              Construct<span className="text-orange-500">Pro</span>
            </span>
          </div>

          {/* Illustration */}
          <div className="relative mx-auto mb-8 flex h-44 w-64 items-center justify-center">
            <div className="absolute h-36 w-36 rounded-full bg-orange-50" />

            <div className="relative text-[110px] font-black leading-none tracking-tighter text-gray-800">
              4
              <span className="text-orange-500">0</span>
              4
            </div>

            <div className="absolute -right-1 top-1 text-4xl">
              🚧
            </div>

            <div className="absolute bottom-0 left-8 h-2 w-48 rounded-full bg-gray-200" />
          </div>

          {/* Text */}
          <div className="mb-9">
            <span className="mb-4 inline-block rounded-full bg-orange-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-600">
              Page not found
            </span>

            <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">
              Упс! Страница не найдена
            </h1>

            <p className="mx-auto max-w-md text-sm leading-6 text-gray-500 sm:text-base">
              Похоже, эта страница находится на реконструкции
              или была перемещена. Проверьте адрес или вернитесь
              на главную страницу.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/manager/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-600"
            >
              <span>⌂</span>
              Вернуться на главную
            </Link>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
              ← Назад
            </button>
          </div>

          <div className="mt-10 border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-400">
              ConstructPro CRM · Construction Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}