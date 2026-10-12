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
      lead="AI Portalへのお問い合わせは、Googleフォームからお送りください。"
    >
      <section>
        <h2>お問い合わせフォーム</h2>
        <p>
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSdP1r0fWxEinCVDqNuMT2nKvCX__2epeWHoxUWc623oxKCAvQ/viewform">
            AI Portal お問い合わせフォーム
          </a>
          に、返信先メールアドレスとお問い合わせ内容を入力してください。回答はGoogleに保存され、お問い合わせへの対応に利用します。Googleアカウントへのログインは不要です。
        </p>
      </section>
      <section>
        <h2>公開可能な記事の誤り・不具合・改善提案</h2>
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
    </InfoPage>
  );
}
