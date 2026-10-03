import type { Metadata } from "next";
import InfoPage from "@/components/info-page";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "AI PORTALにおける個人情報・アクセス情報等の取り扱い方針。",
  alternates: { canonical: absoluteUrl("/privacy") },
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="プライバシーポリシー"
      lead="AI PORTALは、利用者の情報を必要以上に収集せず、サイト運営に必要な範囲で適切に取り扱います。"
    >
      <section>
        <h2>取得する可能性のある情報</h2>
        <p>サイトの配信・保守・セキュリティ確保のため、ホスティング事業者等がIPアドレス、ブラウザ情報、アクセス日時、参照元URLなどの技術情報を処理する場合があります。</p>
      </section>
      <section>
        <h2>Cookie・アクセス解析</h2>
        <p>アクセス解析、広告配信その他の目的でCookie等を利用する場合があります。新たな解析サービスや広告サービスを導入する場合は、必要に応じて本ポリシーを更新します。</p>
      </section>
      <section>
        <h2>広告・アフィリエイト</h2>
        <p>広告またはアフィリエイトリンクを掲載する場合、外部事業者がCookie等を利用することがあります。広告・PRに該当する掲載は、読者が判別できるよう表示します。</p>
      </section>
      <section>
        <h2>外部サイト</h2>
        <p>当サイトからリンクする外部サイトにおける情報の取り扱いについては、それぞれの運営者が定めるプライバシーポリシーをご確認ください。</p>
      </section>
      <section>
        <h2>ポリシーの変更</h2>
        <p>法令、利用サービス、サイト機能の変更等に応じて、本ポリシーを改定することがあります。重要な変更がある場合は、当サイト上でわかる形で反映します。</p>
      </section>
      <p>制定日：2026年10月3日</p>
    </InfoPage>
  );
}
