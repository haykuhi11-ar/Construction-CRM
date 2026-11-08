interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-8">
      <div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-5">
        <input
          type="search"
          placeholder="Search..."
          className="w-64 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
        />

        <button className="relative rounded-xl p-2.5 text-slate-500 hover:bg-gray-100">
          ♧
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
        </button>

        <div className="flex items-center gap-3 border-l border-gray-200 pl-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-600">
            M
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Manager
            </p>
            <p className="text-xs text-gray-400">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}