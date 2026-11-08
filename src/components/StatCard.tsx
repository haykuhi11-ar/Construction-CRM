interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: string;
  accent: string;
  loading?: boolean;
}

function StatCard({
  title,
  value,
  description,
  icon,
  accent,
  loading = false,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-[#E2E7EC] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#8491A0]">
          {title}
        </p>

        <div className={`rounded-xl p-3 ${accent}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="h-9 w-16 animate-pulse rounded-lg bg-gray-100" />
        ) : (
          <h3 className="text-3xl font-bold text-[#263445]">
            {value}
          </h3>
        )}

        <p className="mt-2 text-xs text-[#8491A0]">
          {description}
        </p>
      </div>
    </div>
  );
}

export default StatCard;