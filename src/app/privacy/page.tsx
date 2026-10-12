import type { Metadata } from "next";
import Link from "next/link";
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
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/" className="text-2xl font-black tracking-tighter text-blue-700">AI PORTAL</Link>
          <Link href="/" className="text-xs font-bold text-gray-600 hover:text-blue-700">トップへ戻る</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-black border-b border-gray-200 pb-6">プライバシーポリシー</h1>
        <p className="mt-6 text-sm leading-8 text-gray-700">
          AI Portal（以下「当サイト」）は、記事の提供、利用状況の把握、サイトの改善および安全な配信のために、以下の情報を取り扱います。
        </p>

        <div className="mt-10 space-y-10 text-sm leading-8 text-gray-700 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:border-b [&_h2]:border-gray-200 [&_h2]:pb-2 [&_a]:text-blue-700 [&_a]:underline [&_a]:underline-offset-2">
          <section>
            <h2>Google Analytics 4によるアクセス解析</h2>
            <p className="mt-3">当サイトはGoogle Analytics 4（GA4）を利用し、閲覧されたページ、訪問回数、参照元、利用端末・ブラウザーの種類、おおまかな地域などの利用状況を把握します。ページのスクロールや外部リンクのクリックも測定対象です。対象となる機能がサイト上にある場合は、サイト内検索、フォーム操作、動画の再生、ファイルのダウンロードもGA4の拡張計測の対象になります。これらの情報を、記事の改善とサイトの利用状況の分析に利用します。</p>
            <p className="mt-3">当サイト内に会員登録機能はありません。お問い合わせは下記のGoogleフォームで受け付けています。氏名やメールアドレスをGA4へ送信するための独自の実装はありません。</p>
          </section>

          <section>
            <h2>Cookie等の技術</h2>
            <p className="mt-3">GA4は、訪問を区別するためにCookie等の技術を使用します。当サイトではアクセス解析への同意があるまでGA4を読み込みません。同意または拒否の選択はブラウザーのローカルストレージに保存し、画面左下の「アクセス解析の設定」から変更できます。ブラウザーからGoogleへ、閲覧ページのURL、Cookie等の識別子、IPアドレスやブラウザー情報が送信される場合があります。GoogleのCookieについては、<a href="https://policies.google.com/technologies/cookies?hl=ja">GoogleによるCookieの利用</a>をご確認ください。</p>
            <p className="mt-3">ブラウザーの設定でCookieを制限・削除できます。設定方法はお使いのブラウザーのヘルプをご確認ください。制限すると、アクセス解析など一部の機能に影響する場合があります。</p>
          </section>

          <section>
            <h2>Googleによる情報の取り扱いとオプトアウト</h2>
            <p className="mt-3">Googleが当サイトから送信された情報をどのように取り扱うかは、<a href="https://policies.google.com/technologies/partner-sites?hl=ja">Googleのサービスを使用するサイトやアプリから収集した情報のGoogleによる使用</a>をご確認ください。GA4による閲覧情報の利用を止めたい場合は、<a href="https://support.google.com/analytics/answer/181881?hl=ja">Google アナリティクス オプトアウト アドオン</a>を利用できます。</p>
          </section>

          <section>
            <h2>外部サービスへの情報送信</h2>
            <p className="mt-3">当サイトの配信にはCloudflare Pagesを利用しており、アクセス時のIPアドレス、リクエスト先、端末・ブラウザー情報などがCloudflareに送信されます。これはページの配信と安全性の確保に伴うものです。アクセス解析に同意した場合は、上記のGA4関連情報がGoogleにも送信されます。一部の記事の画像はUnsplashから直接読み込まれるため、その画像を表示する際にはブラウザーからUnsplashへ通信が発生します。</p>
            <p className="mt-3">現時点で、広告配信用のタグやアフィリエイト計測タグはサイトに設定されていません。これらを導入する際は、送信先と取り扱う情報を確認して本ポリシーを更新します。</p>
          </section>

          <section>
            <h2>ポリシーの改定</h2>
            <p className="mt-3">サービスや利用する外部サービスの変更、法令等の改正に応じて本ポリシーを改定します。改定後の内容はこのページでお知らせします。</p>
          </section>

          <section>
            <h2>お問い合わせ</h2>
            <p className="mt-3">本ポリシーや当サイトについては、<a href="https://docs.google.com/forms/d/e/1FAIpQLSdP1r0fWxEinCVDqNuMT2nKvCX__2epeWHoxUWc623oxKCAvQ/viewform">AI Portal お問い合わせフォーム</a>からご連絡ください。返信先メールアドレスとお問い合わせ内容を入力いただきます。フォームの回答はGoogleに保存され、サイト運営者がお問い合わせへの対応に利用します。Googleアカウントへのログインは不要です。</p>
          </section>
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <span>© {new Date().getFullYear()} AI PORTAL. All rights reserved.</span>
          <Link href="/">トップへ戻る</Link>
        </div>
      </footer>
    </div>
  );
}
