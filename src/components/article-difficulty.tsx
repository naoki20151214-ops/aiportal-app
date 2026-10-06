type Props = { level?: number };

const labels = ["入門", "基礎", "仕組み", "実践", "専門", "研究"] as const;

export default function ArticleDifficulty({ level }: Props) {
  if (!Number.isInteger(level) || level === undefined || level < 0 || level > 5) return null;

  const filled = level + 1;
  const empty = 6 - filled;
  const label = labels[level];

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-gray-700"
      aria-label={`難易度 ${filled}/6 ${label}`}
    >
      <span>難易度</span>
      <span aria-hidden="true" className="tracking-[0.08em]">
        <span className="text-amber-500">{"★".repeat(filled)}</span>
        <span className="text-gray-300">{"☆".repeat(empty)}</span>
      </span>
      <span className="text-gray-600">{label}</span>
    </span>
  );
}
