import Image from "next/image";
import Link from "next/link";
import Parser from "rss-parser";

const parser = new Parser();

const FEED_CONFIG = {
  domestic: { name: "国内", url: "https://news.yahoo.co.jp/rss/topics/domestic.xml" },
  it: { name: "IT", url: "https://news.yahoo.co.jp/rss/topics/it.xml" },
  sports: { name: "スポーツ", url: "https://news.yahoo.co.jp/rss/topics/sports.xml" },
} as const;

type CategoryId = keyof typeof FEED_CONFIG;

async function getFeed(categoryId: CategoryId) {
  if (categoryId === "it") {
    return [
      {
        title: "AIによる自動コーディング技術の現状について",
        link: "#",
        pubDate: new Date().toISOString(),
      },
      {
        title: "nanobanana2、新サービス提供開始",
        link: "#",
        pubDate: new Date().toISOString(),
      },
      {
        title: "国内AI企業の動向",
        link: "#",
        pubDate: new Date().toISOString(),
      },
      {
        title: "次世代プロセッサのアーキテクチャ設計",
        link: "#",
        pubDate: new Date().toISOString(),
      },
      {
        title: "量子コンピュータの実用化に向けた課題",
        link: "#",
        pubDate: new Date().toISOString(),
      },
    ];
  }
  try {
    const feed = await parser.parseURL(FEED_CONFIG[categoryId].url);
    return feed.items;
  } catch (error) {
    console.error(`Error fetching RSS feed for ${categoryId}:`, error);
    return [];
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: rawCategory = "it" } = await searchParams;
  const currentCategory = (FEED_CONFIG[rawCategory as CategoryId]
    ? rawCategory
    : "it") as CategoryId;
  const newsItems = await getFeed(currentCategory);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-900">
      {/* Header */}
      <header
        className="border-b border-gray-200 dark:border-zinc-700 sticky top-0 z-50 transition-colors"
        style={{
          backgroundColor: "#f8fafc",
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <div className="hidden md:flex relative">
              <input
                type="text"
                placeholder="キーワードを入力"
                className="bg-white/80 dark:bg-zinc-700/80 backdrop-blur-sm border border-gray-200 dark:border-zinc-600 rounded-md py-1 px-3 w-64 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </button>
            </div>

            {/* Logo centered */}
            <div className="flex flex-col items-center">
              <svg
                width="180"
                height="60"
                viewBox="0 0 180 60"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-sm"
              >
                <defs>
                  <linearGradient id="silver-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>
                </defs>
                {/* Cybernetic Banana Icon */}
                <g transform="translate(75, 2)">
                  <path
                    d="M15 2 C 8 2, 2 12, 2 22 C 2 32, 8 35, 15 35 C 22 35, 28 32, 28 22 C 28 12, 22 2, 15 2"
                    fill="#ffea00"
                  />
                  {/* Circuit lines */}
                  <path d="M8 18 h 14 M10 23 h 10 M15 10 v 15" stroke="#0070f3" strokeWidth="0.8" opacity="0.6" />
                  {/* Subtle '2' shape */}
                  <path
                    d="M13 12 q 4 0, 4 3 t -4 3 h 4"
                    fill="none"
                    stroke="url(#silver-grad)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </g>
                {/* Text: NANOBANANA2 */}
                <text
                  x="55"
                  y="55"
                  fontFamily="ui-sans-serif, system-ui, -apple-system"
                  fontSize="11"
                  fontWeight="300"
                  fill="#94a3b8"
                  letterSpacing="0.2em"
                >
                  NANO
                </text>
                <text
                  x="100"
                  y="55"
                  fontFamily="ui-sans-serif, system-ui, -apple-system"
                  fontSize="15"
                  fontWeight="800"
                  fill="#0070f3"
                  letterSpacing="0.05em"
                  textAnchor="middle"
                >
                  BANANA2
                </text>
                {/* Waveform apexes on A's */}
                <path
                  d="M74 44 l 1.5 -3 l 1.5 3 M101 44 l 1.5 -3 l 1.5 3 M127 44 l 1.5 -3 l 1.5 3"
                  fill="none"
                  stroke="#0070f3"
                  strokeWidth="1"
                />
              </svg>
            </div>

            <div className="text-sm font-medium flex gap-4 text-gray-500">
              <button className="hover:text-blue-600 transition-colors">ログイン</button>
              <button className="hover:text-blue-600 transition-colors">ヘルプ</button>
            </div>
          </div>
        </div>

        {/* Categories Tab */}
        <nav className="max-w-5xl mx-auto px-2 overflow-x-auto scrollbar-hide">
          <ul className="flex justify-center whitespace-nowrap">
            {(
              Object.entries(FEED_CONFIG) as [
                CategoryId,
                (typeof FEED_CONFIG)["domestic"]
              ][]
            ).map(([id, config]) => (
              <li key={id}>
                <Link
                  href={`/?category=${id}`}
                  className={`inline-block px-6 py-2 text-sm font-bold border-b-2 transition-colors ${
                    id === currentCategory
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 dark:text-zinc-400 hover:text-blue-400"
                  }`}
                >
                  {config.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* News Feed */}
        <div className="md:col-span-2 space-y-4">
          <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-zinc-700 flex justify-between items-center">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
                トピックス ({FEED_CONFIG[currentCategory].name})
              </h2>
              <span className="text-xs text-gray-500">{new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })} 更新</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-zinc-700">
              {newsItems.map((item, index) => (
                <a
                  key={index}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer flex gap-4 block"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-600 text-gray-600 dark:text-zinc-300 rounded">
                        {FEED_CONFIG[currentCategory].name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.pubDate ? new Date(item.pubDate).toLocaleString("ja-JP") : ""}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 leading-snug hover:underline">
                      {item.title}
                    </h3>
                  </div>
                  <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-700 rounded relative flex-shrink-0 border border-gray-100 dark:border-zinc-600">
                    <Image
                      src="/file.svg"
                      alt=""
                      fill
                      className="object-contain p-2 opacity-30"
                    />
                  </div>
                </a>
              ))}
              {newsItems.length === 0 && (
                <div className="p-10 text-center text-gray-500">
                  記事が見つかりませんでした。
                </div>
              )}
            </div>
            <div className="p-3 bg-gray-50 dark:bg-zinc-700/30 text-center">
              <button className="text-sm font-bold text-blue-600 hover:underline">
                もっと見る
              </button>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Weather / Info Widget */}
          <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 p-4 text-center">
            <h3 className="text-sm font-bold text-gray-500 mb-2">東京の天気</h3>
            <div className="text-3xl mb-1">☀️</div>
            <div className="text-xl font-bold">18°C / 8°C</div>
            <p className="text-xs text-gray-400 mt-2">降水確率 0%</p>
          </section>

          {/* Ranking */}
          <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700">
            <div className="p-3 border-b border-gray-100 dark:border-zinc-700">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500">
                アクセスランキング
              </h3>
            </div>
            <div className="p-3 space-y-3">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="flex gap-3 items-start">
                  <span className={`font-black text-lg ${num <= 3 ? 'text-blue-500' : 'text-gray-300'}`}>
                    {num}
                  </span>
                  <p className="text-xs font-medium hover:text-blue-600 cursor-pointer line-clamp-2">
                    話題のニュースタイトルがここに入ります。ランキングの詳細は...
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-zinc-800 border-t border-gray-200 dark:border-zinc-700 mt-12 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} News Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
