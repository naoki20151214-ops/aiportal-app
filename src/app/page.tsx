"use client";

import { useState } from "react";

const categories = [
  "最新",
  "AIエージェント",
  "Claude Code",
  "ChatGPT",
  "Gemini",
  "AI画像動画生成",
  "AIツール",
];

type Tool = {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: string;
};

const tools: Tool[] = [
  // 最新
  {
    id: "1",
    category: "最新",
    title: "Gemini 1.5 Pro",
    description: "Googleが提供する最新の高性能AI。長い文章や動画を一瞬で理解して、質問に答えてくれます。",
    icon: "💎",
  },
  {
    id: "2",
    category: "最新",
    title: "Claude 3.5 Sonnet",
    description: "人間のように自然な日本語で、複雑な悩み相談やプログラミングを助けてくれるAIです。",
    icon: "🎭",
  },
  {
    id: "3",
    category: "最新",
    title: "GPT-4o",
    description: "OpenAIの最新モデル。話したり、見せたりしたものを理解して会話ができる、最も有名なAIです。",
    icon: "⚡",
  },
  // AIエージェント
  {
    id: "4",
    category: "AIエージェント",
    title: "AutoGPT",
    description: "やりたいことを伝えるだけで、AIが自分で考えて複数のステップを実行してくれる自律型AIです。",
    icon: "🤖",
  },
  {
    id: "5",
    category: "AIエージェント",
    title: "AgentGPT",
    description: "ブラウザ上で簡単に自分専用のAIアシスタントを作って、目標達成まで働かせることができます。",
    icon: "🌐",
  },
  {
    id: "6",
    category: "AIエージェント",
    title: "BabyAGI",
    description: "タスクの管理と実行をAIが自動で繰り返す、非常にシンプルな自律型エージェントの仕組みです。",
    icon: "👶",
  },
  // Claude Code
  {
    id: "7",
    category: "Claude Code",
    title: "Claude Desktop",
    description: "パソコンにインストールして、ファイルの内容を分析したり要約したりできる便利なアプリです。",
    icon: "💻",
  },
  {
    id: "8",
    category: "Claude Code",
    title: "Claude API",
    description: "自分のアプリやサービスに、賢いAI「Claude」の知能を組み込むことができる仕組みです。",
    icon: "🔌",
  },
  // ChatGPT
  {
    id: "9",
    category: "ChatGPT",
    title: "ChatGPT Free",
    description: "誰でも無料で始められる、対話型AIの基本プラン。日常のちょっとした調べ物に最適です。",
    icon: "💬",
  },
  {
    id: "10",
    category: "ChatGPT",
    title: "ChatGPT Plus",
    description: "最新の機能や画像生成、データ分析などを制限なしでたっぷり使いたい人向けの有料プラン。",
    icon: "🌟",
  },
  // Gemini
  {
    id: "11",
    category: "Gemini",
    title: "Gemini Advanced",
    description: "Googleの最高レベルのAI。Googleマップやメール、Googleドキュメントとの連携が強力です。",
    icon: "🚀",
  },
  {
    id: "12",
    category: "Gemini",
    title: "Gemini for Workspace",
    description: "Googleのドキュメントやスプレッドシートの中で、AIが直接文章作成を手伝ってくれます。",
    icon: "📧",
  },
  // AI画像動画生成
  {
    id: "13",
    category: "AI画像動画生成",
    title: "Midjourney",
    description: "言葉を入力するだけで、驚くほど芸術的で美しい画像を作り出してくれるクリエイティブAIです。",
    icon: "🎨",
  },
  {
    id: "14",
    category: "AI画像動画生成",
    title: "Luma Dream Machine",
    description: "テキストや1枚の画像から、映画のような高品質なショート動画を生成できる最新ツール。",
    icon: "🎬",
  },
  {
    id: "15",
    category: "AI画像動画生成",
    title: "Stable Diffusion",
    description: "自分で好みの設定を細かく調整して、思い通りの画像を生成できる自由度の高いAIです。",
    icon: "⚙️",
  },
  // AIツール
  {
    id: "16",
    category: "AIツール",
    title: "Notion AI",
    description: "人気のメモアプリNotion内で、文章の要約や翻訳、アイデア出しをAIがサポートしてくれます。",
    icon: "📝",
  },
  {
    id: "17",
    category: "AIツール",
    title: "Perplexity",
    description: "調べたいことを入力すると、ネット上の信頼できる情報源から回答をまとめてくれる検索AI。",
    icon: "🔍",
  },
  {
    id: "18",
    category: "AIツール",
    title: "Canva AI",
    description: "デザインの知識がなくても、AIの力でおしゃれなバナーや資料を簡単に作れるツールです。",
    icon: "🖼️",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("最新");

  const filteredTools = tools.filter((tool) => tool.category === activeTab);

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-gray-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100/50 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-black">AIポータル</h1>
        </div>
        <nav className="flex gap-6 text-sm font-medium text-gray-500">
          <a href="#" className="hover:text-black transition-colors">
            Home
          </a>
          <a href="#" className="hover:text-black transition-colors">
            About
          </a>
        </nav>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Title Section */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight text-gray-900 leading-tight">
            AIで、あなたの毎日を
            <br className="md:hidden" />
            もっとスマートに。
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            最新のAIツールから、初心者に最適なものを厳選。
            <br />
            まずは使ってみることから始めましょう。
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-12 sticky top-20 z-40 bg-[#fbfbfd]/80 backdrop-blur-md py-2 -mx-6 px-6">
          <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar scroll-smooth focus-visible:outline-none">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                  activeTab === category
                    ? "bg-black text-white shadow-md scale-100"
                    : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-100"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="group bg-white border border-gray-100/80 rounded-[2.5rem] p-8 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 hover:-translate-y-1.5 flex flex-col h-full"
            >
              <div className="text-5xl mb-8 bg-gray-50/50 w-20 h-20 flex items-center justify-center rounded-3xl group-hover:scale-105 transition-transform duration-500">
                {tool.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">{tool.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-10 flex-grow font-medium">
                {tool.description}
              </p>
              <button className="w-full bg-gray-50 text-gray-900 font-bold py-4 px-6 rounded-2xl hover:bg-black hover:text-white transition-all duration-300 text-sm active:scale-[0.98]">
                使ってみる
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-gray-100 mt-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 text-gray-400">
             <div className="w-6 h-6 bg-gray-200 rounded-md flex items-center justify-center text-[10px] font-bold text-gray-400">A</div>
             <span className="text-xs font-semibold uppercase tracking-widest">AI Portal</span>
          </div>
          <div className="flex gap-8 text-gray-400 text-xs font-medium">
            <a href="#" className="hover:text-black transition-colors">
              プライバシーポリシー
            </a>
            <a href="#" className="hover:text-black transition-colors">
              利用規約
            </a>
            <a href="#" className="hover:text-black transition-colors">
              お問い合わせ
            </a>
          </div>
          <div className="text-gray-300 text-xs font-medium">
            © 2026 AI Portal. Designed for simplicity.
          </div>
        </div>
      </footer>
    </div>
  );
}
