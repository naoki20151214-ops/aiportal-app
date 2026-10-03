import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "運営情報" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/terms", label: "利用規約" },
  { href: "/advertising", label: "広告掲載ポリシー" },
  { href: "/contact", label: "お問い合わせ" },
];

export default function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10 mt-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-800 pb-8 mb-8">
          <Link href="/" className="text-xl font-black text-white tracking-tighter">AI PORTAL</Link>
          <nav aria-label="フッターナビゲーション" className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold">
            {footerLinks.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">{item.label}</Link>
            ))}
          </nav>
        </div>
        <div className="text-[10px] font-bold tracking-widest uppercase">
          © {new Date().getFullYear()} AI PORTAL. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
