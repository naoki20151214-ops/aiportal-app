import Link from "next/link";

export default function ArticleNotFound() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-4">記事が見つかりません</h1>
      <Link href="/" className="text-blue-700 hover:underline">トップへ戻る</Link>
    </main>
  );
}
