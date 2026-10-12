import type { Metadata } from "next";
import InfoPage from "@/components/info-page";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "利用規約",
  description: "AI PORTALを利用する際の基本条件。",
  alternates: { canonical: absoluteUrl("/terms") },
};

export default function TermsPage() {
  return (
    <InfoPage title="利用規約" lead="AI PORTALをご利用いただく際の基本的な条件を定めています。">
      <section>
        <h2>情報の利用</h2>
        <p>当サイトの情報は一般的な情報提供を目的としています。内容の正確性・完全性・最新性の確保に努めますが、すべてを保証するものではありません。</p>
      </section>
      <section>
        <h2>禁止事項</h2>
        <ul>
          <li>法令に違反する行為、または第三者の権利を侵害する行為</li>
          <li>サイト運営を妨害する行為、不正アクセスその他これに類する行為</li>
          <li>当サイトのコンテンツを、引用の範囲を超えて無断転載・再配布する行為</li>
        </ul>
      </section>
      <section>
        <h2>外部サービス</h2>
        <p>当サイトで紹介するAIサービス、ソフトウェア、外部サイトの利用条件・料金・仕様等は各提供者が定めます。契約や利用の前に、公式サイトの最新情報をご確認ください。</p>
      </section>
      <section>
        <h2>免責</h2>
        <p>当サイトの情報を利用したこと、または利用できなかったことにより生じた損害について、法令上責任を負う場合を除き、当サイトは責任を負いません。</p>
      </section>
      <section>
        <h2>規約の変更</h2>
        <p>必要に応じて本規約を変更することがあります。変更内容は当サイトへの掲載をもって反映します。</p>
      </section>
      <p>制定日：2026年10月3日</p>
    </InfoPage>
  );
}
