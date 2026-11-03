export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  // "<" をエスケープして、JSON内の文字列が script を閉じないようにする
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
