import type { ReactNode } from "react";
import Link from "next/link";
import SiteFooter from "@/components/site-footer";

export default function InfoPage({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <header className="border-b border-gray-200 sticky top-0 bg-white z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/" className="text-2xl font-black tracking-tighter text-blue-700">AI PORTAL</Link>
          <Link href="/" className="text-xs font-bold text-gray-600 hover:text-blue-700">トップへ戻る</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <header className="border-b border-gray-200 pb-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-black leading-snug">{title}</h1>
          {lead && <p className="text-sm sm:text-base text-gray-600 leading-7 mt-4">{lead}</p>}
        </header>
        <div className="space-y-7 text-sm sm:text-base leading-8 text-gray-700 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h3]:font-bold [&_h3]:text-gray-900 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-blue-700 [&_a]:underline">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
