"use client";

import React, { useState } from "react";

// カテゴリ定義
const categories = [
  "最新",
  "AIエージェント",
  "Claude Code",
  "ChatGPT",
  "Gemini",
  "AI画像動画生成",
  "AIツール",
];

// 記事の型定義
type Article = {
  id: number;
  category: string;
  title: string;
  lead: string;
  time: string;
  thumbnail: string;
  isNew?: boolean;
};

// モック記事データ
const articles: Article[] = [
  {
    id: 1,
    category: "最新",
    title: "OpenAI、次世代モデル「GPT-5」のトレーニング開始を示唆か",
    lead: "サム・アルトマンCEOが最新のインタビューで、計算リソースの劇的な増加と次世代モデルへの期待について語りました。",
    time: "10分前",
    thumbnail: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=200&h=150&fit=crop",
    isNew: true,
  },
  {
    id: 2,
    category: "AIエージェント",
    title: "自律型AI「Devin」がソフトウェア開発の現場をどう変えるのか",
    lead: "バグ修正からデプロイまでを自律的にこなすAIエンジニアDevin。導入企業の初期フィードバックをまとめました。",
    time: "45分前",
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200&h=150&fit=crop",
  },
  {
    id: 3,
    category: "Claude Code",
    title: "Claude Codeの高度な使い方：CLIからの自動リファクタリング術",
    lead: "ターミナルから直接コードを編集・テストできるAnthropicの最新ツール「Claude Code」の活用事例を紹介します。",
    time: "1時間前",
    thumbnail: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=200&h=150&fit=crop",
    isNew: true,
  },
  {
    id: 4,
    category: "ChatGPT",
    title: "ChatGPTの「SearchGPT」機能、全ユーザーに開放へ",
    lead: "リアルタイムのウェブ検索結果を統合したSearchGPT。従来の検索エンジンとの違いを徹底比較します。",
    time: "2時間前",
    thumbnail: "https://images.unsplash.com/photo-1676299081847-824916de030a?w=200&h=150&fit=crop",
  },
  {
    id: 5,
    category: "Gemini",
    title: "Google Gemini 1.5 Proが200万トークンに対応、長編映画の解析も可能に",
    lead: "圧倒的なコンテキストウィンドウを誇る最新モデル。ビジネスにおける膨大な資料読み込みの革命となるか。",
    time: "3時間前",
    thumbnail: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=200&h=150&fit=crop",
  },
  {
    id: 6,
    category: "AI画像動画生成",
    title: "Soraに続く衝撃。Luma Dream Machineが動画生成の民主化を加速",
    lead: "誰でも高品質な動画を生成できる時代の到来。クリエイターに求められるスキルはどう変化するのか。",
    time: "5時間前",
    thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&h=150&fit=crop",
  },
  {
    id: 7,
    category: "AIツール",
    title: "生産性を10倍にする！2026年最新AIツール20選",
    lead: "リサーチ、ライティング、コーディング。あらゆる業務を効率化する厳選ツールをカテゴリ別に紹介。",
    time: "6時間前",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&h=150&fit=crop",
  },
  {
    id: 8,
    category: "最新",
    title: "Apple、独自のAIモデル「Apple Intelligence」を大幅アップデート",
    lead: "プライバシーを重視したオンデバイス処理がさらに強化。Siriの理解力が劇的に向上しました。",
    time: "8時間前",
    thumbnail: "https://images.unsplash.com/photo-1611186871348-b1ec696e52c9?w=200&h=150&fit=crop",
  },
];

// ランキングデータ
const ranking = [
  "Claude Code のインストール方法",
  "GPT-5 発売時期予想",
  "画像生成AI 著作権ガイドライン",
  "Gemini vs ChatGPT 性能比較",
  "AIエージェントによる自動化事例",
];

// キーワードデータ
const keywords = ["LLM", "RAG", "エージェント", "GPU", "NVIDIA", "Python", "TypeScript", "プロンプト"];

export default function Home() {
  const [activeTab, setActiveTab] = useState("最新");

  const filteredArticles = activeTab === "最新" 
    ? articles 
    : articles.filter(a => a.category === activeTab);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Header / Navigation */}
      <header className="border-b border-gray-200 sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-2xl font-black tracking-tighter text-blue-700">AI PORTAL</h1>
            <div className="hidden md:flex items-center space-x-4 text-xs font-bold">
              <span className="text-gray-500">2026年4月14日 火曜日</span>
            </div>
          </div>
          <nav className="flex overflow-x-auto no-scrollbar border-t border-gray-100 py-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`flex-shrink-0 px-4 py-1 text-sm font-bold transition-colors ${
                  activeTab === cat
                    ? "text-blue-600 bg-blue-50 rounded"
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Article List (Left) */}
          <div className="lg:w-2/3">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-900 pb-1">
              <h2 className="text-lg font-black">{activeTab}ニュース</h2>
              <span className="text-xs text-gray-500">件数: {filteredArticles.length}件</span>
            </div>
            
            <div className="space-y-4">
              {filteredArticles.map((article) => (
                <article key={article.id} className="flex gap-4 pb-4 border-b border-gray-100 group cursor-pointer">
                  <div className="w-24 h-18 sm:w-32 sm:h-24 flex-shrink-0 bg-gray-100 overflow-hidden rounded">
                    <img 
                      src={article.thumbnail} 
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded uppercase">
                        {article.category}
                      </span>
                      {article.isNew && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-500 text-white rounded uppercase italic">
                          New
                        </span>
                      )}
                      <time className="text-xs text-gray-400">{article.time}</time>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold leading-snug group-hover:text-blue-700 mb-1 line-clamp-2">
                      <a href="#">{article.title}</a>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 leading-relaxed">
                      {article.lead}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <button className="w-full mt-6 py-3 border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded transition-colors">
              もっと見る
            </button>
          </div>

          {/* Sidebar (Right) */}
          <aside className="lg:w-1/3 space-y-8">
            
            {/* Ranking Card */}
            <section className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-sm font-black border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-600 inline-block"></span>
                アクセスランキング
              </h2>
              <ol className="space-y-3">
                {ranking.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`text-lg font-black italic ${i < 3 ? 'text-blue-600' : 'text-gray-300'}`}>
                      {i + 1}
                    </span>
                    <a href="#" className="text-xs font-bold leading-tight hover:text-blue-700 hover:underline">
                      {item}
                    </a>
                  </li>
                ))}
              </ol>
            </section>

            {/* Keyword Card */}
            <section>
              <h2 className="text-sm font-black border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-600 inline-block"></span>
                注目のキーワード
              </h2>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <a 
                    key={kw} 
                    href="#" 
                    className="text-[11px] font-bold px-3 py-1 bg-white border border-gray-200 rounded-full hover:border-blue-500 hover:text-blue-600 transition-all"
                  >
                    #{kw}
                  </a>
                ))}
              </div>
            </section>

            {/* Recommended Tools */}
            <section>
              <h2 className="text-sm font-black border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-600 inline-block"></span>
                おすすめAIツール
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded text-sm font-bold">C</div>
                  <div>
                    <div className="text-xs font-bold">Claude 3.5 Sonnet</div>
                    <div className="text-[10px] text-gray-500">最も自然な日本語対話</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center rounded text-sm font-bold">G</div>
                  <div>
                    <div className="text-xs font-bold">Gemini Advanced</div>
                    <div className="text-[10px] text-gray-500">Googleの最強AIモデル</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="w-10 h-10 bg-green-600 text-white flex items-center justify-center rounded text-sm font-bold">P</div>
                  <div>
                    <div className="text-xs font-bold">Perplexity AI</div>
                    <div className="text-[10px] text-gray-500">爆速リサーチエンジン</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Banner Placeholder */}
            <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center rounded border border-gray-200">
              <span className="text-xs font-bold text-gray-400 italic">ADVERTISEMENT</span>
            </div>

          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-800 pb-8 mb-8">
            <h2 className="text-xl font-black text-white tracking-tighter">AI PORTAL</h2>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold">
              <a href="#" className="hover:text-white">運営会社</a>
              <a href="#" className="hover:text-white">プライバシーポリシー</a>
              <a href="#" className="hover:text-white">利用規約</a>
              <a href="#" className="hover:text-white">広告掲載について</a>
              <a href="#" className="hover:text-white">お問い合わせ</a>
            </nav>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold tracking-widest uppercase">
            <span>© 2026 AI PORTAL. All rights reserved.</span>
            <div className="flex gap-4">
              <span>Twitter</span>
              <span>Facebook</span>
              <span>RSS</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Style overrides for high density */}
      <style jsx global>{`
        body {
          background-color: #fff !important;
          color: #1a1a1a !important;
        }
        a {
          color: inherit;
          text-decoration: none;
        }
        a:hover {
          color: #2563eb;
        }
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
