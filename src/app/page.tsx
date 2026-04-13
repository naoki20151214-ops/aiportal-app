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
    description: "Googleが提供する最新の高性能AI。長大な文書や動画も一瞬で理解します。",
    icon: "💎",
  },
  {
    id: "2",
    category: "最新",
    title: "Claude 3.5 Sonnet",
    description: "非常に自然な日本語と、プログラミングや分析における高い知性を備えています。",
    icon: "🎭",
  },
  {
    id: "3",
    category: "最新",
    title: "GPT-4o",
    description: "OpenAIのフラッグシップモデル。音声・視覚・テキストを統合した万能型AIです。",
    icon: "⚡",
  },
  // AIエージェント
  {
    id: "4",
    category: "AIエージェント",
    title: "AutoGPT",
    description: "目標を設定するだけで、AIが自律的にタスクを細分化して実行します。",
    icon: "🤖",
  },
  {
    id: "5",
    category: "AIエージェント",
    title: "AgentGPT",
    description: "ブラウザ上で簡単にAIエージェントを作成・実行できる初心者向けツール。",
    icon: "🌐",
  },
  {
    id: "6",
    category: "AIエージェント",
    title: "BabyAGI",
    description: "シンプルなタスク管理と実行に特化した、自律型AIの先駆け的システム。",
    icon: "👶",
  },
  // Claude Code
  {
    id: "7",
    category: "Claude Code",
    title: "Claude Desktop",
    description: "PC上で直接動作し、ファイルの読み書きや分析をシームレスに行えます。",
    icon: "💻",
  },
  {
    id: "8",
    category: "Claude Code",
    title: "Claude API",
    description: "開発者向け。独自のアプリケーションにClaudeの知能を組み込むことができます。",
    icon: "🔌",
  },
  // ChatGPT
  {
    id: "9",
    category: "ChatGPT",
    title: "ChatGPT Free",
    description: "誰でも無料で始められる、世界で最も有名な対話型AIの基本プラン。",
    icon: "💬",
  },
  {
    id: "10",
    category: "ChatGPT",
    title: "ChatGPT Plus",
    description: "最新モデルや画像生成、データ分析機能が使える有料プレミアムプラン。",
    icon: "🌟",
  },
  // Gemini
  {
    id: "11",
    category: "Gemini",
    title: "Gemini Advanced",
    description: "Google Workspaceとの連携も強力な、Google最高峰のAIサービス。",
    icon: "🚀",
  },
  {
    id: "12",
    category: "Gemini",
    title: "Gemini for Google Workspace",
    description: "ドキュメントやメール作成を、Googleのアプリ内で直接AIが手助けします。",
    icon: "📧",
  },
  // AI画像動画生成
  {
    id: "13",
    category: "AI画像動画生成",
    title: "Midjourney",
    description: "言葉（プロンプト）を入力するだけで、芸術的な画像を生み出すAI。",
    icon: "🎨",
  },
  {
    id: "14",
    category: "AI画像動画生成",
    title: "Luma Dream Machine",
    description: "高品質な動画をテキストや画像から生成できる、次世代の動画AI。",
    icon: "🎬",
  },
  {
    id: "15",
    category: "AI画像動画生成",
    title: "Stable Diffusion",
    description: "自由度が高く、自分好みの画像生成環境を構築できるオープンソースAI。",
    icon: "⚙️",
  },
  // AIツール
  {
    id: "16",
    category: "AIツール",
    title: "Notion AI",
    description: "メモやドキュメント作成をAIが加速。文章の要約や構成案もお任せ。",
    icon: "📝",
  },
  {
    id: "17",
    category: "AIツール",
    title: "Perplexity",
    description: "「検索の再発明」。知りたいことに、出典付きで正確に答えてくれる検索AI。",
    icon: "🔍",
  },
  {
    id: "18",
    category: "AIツール",
    title: "Canva AI",
    description: "デザイン未経験でも、AIの力でおしゃれなバナーや資料が簡単に作れます。",
    icon: "🖼️",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("最新");

  const filteredTools = tools.filter((tool) => tool.category === activeTab);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">AIポータル</h1>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-500">
          <a href="#" className="hover:text-black transition-colors">
            ホーム
          </a>
          <a href="#" className="hover:text-black transition-colors">
            ランキング
          </a>
          <a href="#" className="hover:text-black transition-colors">
            ガイド
          </a>
        </nav>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Navigation Tabs */}
        <div className="mb-12">
          <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar -mx-6 px-6 scroll-smooth">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  activeTab === category
                    ? "bg-black text-white shadow-lg shadow-black/10 scale-105"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Hero Section */}
        <div className="mb-16 text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
            AIで、あなたの毎日を
            <br />
            もっとシンプルに。
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
            世界中の最新AIツールから、初心者に最適なものを厳選。
            <br className="hidden md:block" />
            難しい設定なしで、今日から使える知能を体験しましょう。
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="group bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-2xl hover:shadow-gray-200 transition-all duration-500 hover:-translate-y-1 flex flex-col h-full"
            >
              <div className="text-4xl mb-6 bg-gray-50 w-16 h-16 flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform duration-500">
                {tool.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{tool.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-grow">
                {tool.description}
              </p>
              <button className="w-full bg-gray-50 text-gray-900 font-semibold py-3 px-6 rounded-xl hover:bg-black hover:text-white transition-all duration-300 text-sm">
                詳細を見る
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-gray-400 text-sm">
            © 2026 AIポータル. All rights reserved.
          </div>
          <div className="flex gap-8 text-gray-400 text-sm">
            <a href="#" className="hover:text-black">
              プライバシーポリシー
            </a>
            <a href="#" className="hover:text-black">
              お問い合わせ
            </a>
          </div>
        </div>
      </footer>

      {/* Custom Styles for hiding scrollbar */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
