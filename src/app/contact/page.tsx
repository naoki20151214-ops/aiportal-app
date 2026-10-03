import type { Metadata } from "next";
import InfoPage from "@/components/info-page";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "AI PORTALへのお問い合わせ方法。",
  alternates: { canonical: absoluteUrl("/contact") },
};

export default function ContactPage() {
  return (
    <InfoPage
      title="お問い合わせ"
      lead="現在、サイト内容に関する公開可能なご連絡はGitHub Issuesで受け付けています。"
    >
      <section>
        <h2>サイトの誤り・不具合・改善提案</h2>
        <p>
          記事の事実誤認、リンク切れ、表示不具合、改善提案は
          <a href="https://github.com/naoki20151214-ops/aiportal-app/issues" target="_blank" rel="noopener noreferrer">
            AI PORTALのGitHub Issues
          </a>
          からご連絡ください。
        </p>
      </section>
      <section>
        <h2>ご注意</h2>
        <p>GitHub Issuesは公開されます。氏名、住所、電話番号、メールアドレス、契約情報その他の個人情報・機密情報は投稿しないでください。</p>
      </section>
      <section>
        <h2>広告・営業のお問い合わせ</h2>
        <p>現時点では、個別の広告掲載依頼や営業連絡の専用窓口は設けていません。受付方法を整備した場合は、このページで案内します。</p>
      </section>
    </InfoPage>
  );
}
