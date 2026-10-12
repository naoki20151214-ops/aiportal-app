import type { Metadata } from "next";
import InfoPage from "@/components/info-page";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "運営情報",
  description: "AI PORTALの目的、編集方針、運営情報について。",
  alternates: { canonical: absoluteUrl("/about") },
};

export default function AboutPage() {
  return (
    <InfoPage
      title="運営情報"
      lead="AI PORTALは、AIの基礎から生成AI・AIエージェント・各種ツールの活用までを、できるだけ正確に、わかりやすく整理する情報サイトです。"
    >
      <section>
        <h2>サイトの目的</h2>
        <p>AIに関する情報は更新が速く、製品名・機能・料金・提供条件が短期間で変わることがあります。AI PORTALでは、一次情報を優先し、読者が「何ができるのか」「どこに注意すべきか」を判断できる形で整理することを目指します。</p>
      </section>
      <section>
        <h2>運営</h2>
        <p>運営・編集：AI Portal編集部</p>
        <p>URL：https://aiportal.blog</p>
      </section>
      <section>
        <h2>編集方針</h2>
        <ul>
          <li>製品仕様や発表内容は、可能な限り公式情報・一次資料を確認します。</li>
          <li>事実と編集部の解説・見解を混同しないように記述します。</li>
          <li>情報が変更された場合は、確認できた範囲で記事を更新します。</li>
          <li>広告・アフィリエイトを掲載する場合は、読者が判別できるよう明示します。</li>
        </ul>
      </section>
      <section>
        <h2>免責について</h2>
        <p>掲載内容は情報提供を目的としており、特定の製品・サービスの購入、契約、投資その他の行為を保証または推奨するものではありません。重要な判断を行う際は、必ず各サービスの公式情報をご確認ください。</p>
      </section>
    </InfoPage>
  );
}
