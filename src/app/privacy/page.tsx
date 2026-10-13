import type { Metadata } from "next";
import InfoPage from "@/components/info-page";
import { absoluteUrl, siteName } from "@/lib/site";

const title = "プライバシーポリシー";
const description = "AI Portalのアクセス解析、Cookie、外部サービスへの情報送信についてご案内します。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl("/privacy") },
  openGraph: { type: "website", title, description, url: absoluteUrl("/privacy"), siteName, locale: "ja_JP" },
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="プライバシーポリシー"
      lead="AI Portal（以下「当サイト」）は、記事の提供、利用状況の把握、サイトの改善および安全な配信のために、以下の情報を取り扱います。"
    >
      <section>
        <h2>Google Analytics 4によるアクセス解析</h2>
        <p>当サイトはGoogle Analytics 4（GA4）を利用し、閲覧されたページ、訪問回数、参照元、利用端末・ブラウザーの種類、おおまかな地域などの利用状況を把握します。ページのスクロールや外部リンクのクリックも測定対象です。対象となる機能がサイト上にある場合は、サイト内検索、フォーム操作、動画の再生、ファイルのダウンロードもGA4の拡張計測の対象になります。これらの情報を、記事の改善とサイトの利用状況の分析に利用します。</p>
        <p>当サイト内に会員登録機能はありません。お問い合わせは下記のGoogleフォームで受け付けています。氏名やメールアドレスをGA4へ送信するための独自の実装はありません。</p>
      </section>
      <section>
        <h2>Cookie等の技術</h2>
        <p>GA4は、訪問を区別するためにCookie等の技術を使用します。当サイトではアクセス解析への同意があるまでGA4を読み込みません。同意または拒否の選択はブラウザーのローカルストレージに保存し、画面左下の「アクセス解析の設定」から変更できます。ブラウザーからGoogleへ、閲覧ページのURL、Cookie等の識別子、通信に伴うIPアドレスやブラウザー情報が送信される場合があります。GoogleのCookieについては、<a href="https://policies.google.com/technologies/cookies?hl=ja">GoogleによるCookieの利用</a>をご確認ください。</p>
        <p>ブラウザーの設定でCookieを制限・削除できます。設定方法はお使いのブラウザーのヘルプをご確認ください。制限すると、アクセス解析など一部の機能に影響する場合があります。</p>
      </section>
      <section>
        <h2>Googleによる情報の取り扱いとオプトアウト</h2>
        <p>Googleが当サイトから送信された情報をどのように取り扱うかは、<a href="https://policies.google.com/technologies/partner-sites?hl=ja">Googleのサービスを使用するサイトやアプリから収集した情報のGoogleによる使用</a>をご確認ください。GA4による閲覧情報の利用を止めたい場合は、<a href="https://support.google.com/analytics/answer/181881?hl=ja">Google アナリティクス オプトアウト アドオン</a>を利用できます。</p>
      </section>
      <section>
        <h2>外部サービスへの情報送信</h2>
        <p>当サイトの配信にはCloudflare Pagesを利用しており、アクセス時のIPアドレス、リクエスト先、端末・ブラウザー情報などがCloudflareに送信されます。これはページの配信と安全性の確保に伴うものです。アクセス解析に同意した場合は、上記のGA4関連情報がGoogle LLCおよびその関係会社にも送信され、閲覧の傾向や履歴の分析に利用されます。送信される情報とGoogle側の利用目的については、<a href="https://business.safety.google/intl/ja/tba-jp/">Googleの外部送信に関する参考情報</a>もご確認ください。一部の記事の画像はUnsplashから直接読み込まれるため、その画像を表示する際にはブラウザーからUnsplashへ通信が発生します。</p>
        <p>現時点で、広告配信用のタグやアフィリエイト計測タグはサイトに設定されていません。これらを導入する際は、送信先と取り扱う情報を確認して本ポリシーを更新します。</p>
      </section>
      <section>
        <h2>記事の理解度評価・誤り報告</h2>
        <p>記事末尾では「理解できた」「一部むずかしかった」「理解できなかった」などの評価や、誤りの報告を受け付ける機能を準備しています。保存機能の設定が完了していない間は、既存のGoogleお問い合わせフォームをご案内します。</p>
        <p>この機能が有効な場合、選択した評価と理由、任意のコメント、記事IDと記事の更新日、受信日時、受付番号をCloudflare D1に保存し、記事の改善と事実関係の確認に利用します。名前やメールアドレスは必須ではありません。自由記述欄には氏名、連絡先などの個人情報を書かないでください。利用者が記載した情報がコメントに含まれる可能性があります。</p>
        <p>不正投稿を防ぐため、Cloudflare Turnstileによる確認を行います。Turnstile側では通信時の端末・ブラウザー情報などを取り扱う場合があります。投稿内容は一般公開せず、運営者による確認・改善のために使用します。</p>
      </section>
      <section>
        <h2>ポリシーの改定</h2>
        <p>サービスや利用する外部サービスの変更、法令等の改正に応じて本ポリシーを改定します。改定後の内容はこのページでお知らせします。</p>
      </section>
      <section>
        <h2>お問い合わせ</h2>
        <p>本ポリシーや当サイトについては、<a href="https://docs.google.com/forms/d/e/1FAIpQLSdP1r0fWxEinCVDqNuMT2nKvCX__2epeWHoxUWc623oxKCAvQ/viewform">AI Portal お問い合わせフォーム</a>からご連絡ください。返信先メールアドレスとお問い合わせ内容を入力いただきます。フォームの回答はGoogleに保存され、サイト運営者がお問い合わせへの対応に利用します。Googleアカウントへのログインは不要です。</p>
      </section>
      <p>制定日：2026年10月3日／改定日：2026年10月13日</p>
    </InfoPage>
  );
}
