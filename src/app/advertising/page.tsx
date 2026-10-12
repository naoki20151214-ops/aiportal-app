import type { Metadata } from "next";
import InfoPage from "@/components/info-page";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "広告掲載ポリシー",
  description: "AI PORTALの広告・PR・アフィリエイト掲載方針。",
  alternates: { canonical: absoluteUrl("/advertising") },
};

export default function AdvertisingPage() {
  return (
    <InfoPage
      title="広告掲載ポリシー"
      lead="AI PORTALでは、広告・PR・アフィリエイトと編集記事を区別し、読者の判断を妨げない運用を行います。"
    >
      <section>
        <h2>広告・PRの表示</h2>
        <p>広告、スポンサー掲載、アフィリエイトリンク等によって運営者が報酬を受け取る可能性がある場合は、「広告」「PR」「アフィリエイト」等の表示を行います。</p>
      </section>
      <section>
        <h2>編集内容との分離</h2>
        <p>報酬の有無だけを理由として、記事内の事実関係や評価を変更しません。製品・サービスを紹介する場合も、読者にとっての関連性と有用性を基準にします。</p>
      </section>
      <section>
        <h2>外部リンク</h2>
        <p>広告・アフィリエイト経由で外部サービスを利用する場合、契約・購入・個人情報の入力等はリンク先事業者との間で行われます。条件は必ずリンク先の最新情報をご確認ください。</p>
      </section>
      <section>
        <h2>掲載内容の見直し</h2>
        <p>終了したサービス、条件が大きく変わった案件、読者に不利益となる可能性が高い掲載は、確認でき次第、修正または削除します。</p>
      </section>
    </InfoPage>
  );
}
