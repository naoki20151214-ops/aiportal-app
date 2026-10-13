"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import type { FeedbackRating, FeedbackReason } from "@/lib/article-feedback-schema";

// Use the existing, privacy-disclosed Google Form until D1 and Turnstile are
// configured and smoke-tested. This link remains available if JS is blocked.
const CONTACT_FORM = "https://docs.google.com/forms/d/e/1FAIpQLSdP1r0fWxEinCVDqNuMT2nKvCX__2epeWHoxUWc623oxKCAvQ/viewform";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const ENABLED = process.env.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED === "1" && SITE_KEY.length > 0;

interface TurnstileBrowser {
  render(element: HTMLElement, options: {
    sitekey: string;
    action: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
  }): string;
  reset(widgetId?: string): void;
  remove(widgetId: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileBrowser;
  }
}
const ratings: ReadonlyArray<{ value: FeedbackRating; label: string }> = [
  { value: "understood", label: "理解できた" },
  { value: "partly", label: "一部むずかしかった" },
  { value: "difficult", label: "理解できなかった" },
];
const reasons: ReadonlyArray<{ value: FeedbackReason; label: string }> = [
  { value: "hard-text", label: "説明が難しい" },
  { value: "hard-visuals", label: "図が分かりにくい" },
  { value: "need-examples", label: "例が足りない" },
  { value: "jargon", label: "用語が難しい" },
  { value: "other", label: "その他" },
];

export default function ArticleFeedback({
  articleId, slug, revision, title,
}: {
  articleId?: string;
  slug: string;
  revision: string;
  title: string;
}) {
  const [kind, setKind] = useState<"rating" | "correction">("rating");
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [reason, setReason] = useState<FeedbackReason | "">("");
  const [note, setNote] = useState("");
  const [token, setToken] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const challengeContainer = useRef<HTMLDivElement>(null);
  const challengeId = useRef<string | null>(null);

  const renderChallenge = useCallback(() => {
    if (!ENABLED || !challengeContainer.current || !window.turnstile || challengeId.current) return;
    challengeId.current = window.turnstile.render(challengeContainer.current, {
      sitekey: SITE_KEY,
      action: "article_feedback",
      callback: setToken,
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }, []);

  useEffect(() => () => {
    if (challengeId.current && window.turnstile) {
      window.turnstile.remove(challengeId.current);
      challengeId.current = null;
    }
  }, []);

  const ready = Boolean(articleId) && Boolean(token) &&
    (kind === "rating" ? Boolean(rating) : note.trim().length >= 8);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ENABLED || !ready || sending || !articleId) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          articleId, slug, revision, kind,
          rating: kind === "rating" ? rating : null,
          reason: kind === "rating" && rating !== "understood" ? reason || null : null,
          note: note.trim(),
          turnstileToken: token,
        }),
      });
      const result = await response.json() as { ok?: boolean };
      if (!response.ok || result.ok !== true) throw new Error("Feedback was not saved");
      setSent(true);
    } catch {
      setError("送信できませんでした。再試行するか、お問い合わせフォームをご利用ください。");
    } finally {
      setSending(false);
      setToken("");
      if (challengeId.current) window.turnstile?.reset(challengeId.current);
    }
  }

  return (
    <section className="mt-10 rounded-xl border border-blue-100 bg-blue-50/40 p-5 sm:p-6" aria-label="記事へのフィードバック">
      <h2 className="text-lg font-bold text-gray-900">この記事は理解できましたか？</h2>
      <p className="mt-2 text-sm leading-7 text-gray-700">
        ご意見をもとに説明や図解を改善します。名前やメールアドレスの入力は不要です。
      </p>
      {ENABLED && articleId ? (
        sent ? (
          <p className="mt-4 rounded-lg bg-white p-4 text-sm font-semibold text-green-800" role="status">
            ご協力ありがとうございます。フィードバックを受け付けました。
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="理解度を選択">
              {ratings.map((option) => (
                <button key={option.value} type="button"
                  aria-pressed={kind === "rating" && rating === option.value}
                  onClick={() => { setKind("rating"); setRating(option.value); setError(""); }}
                  className={"rounded-lg border px-3 py-2 text-sm font-semibold " +
                    (kind === "rating" && rating === option.value
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-gray-300 bg-white text-gray-800 hover:border-blue-600")}>
                  {option.label}
                </button>
              ))}
            </div>

            <button type="button" onClick={() => { setKind("correction"); setError(""); }}
              aria-pressed={kind === "correction"}
              className="text-sm font-semibold text-blue-700 underline underline-offset-2">
              記事の誤りを報告する
            </button>

            {kind === "rating" && rating && rating !== "understood" && (
              <div>
                <label htmlFor="feedback-reason" className="block text-sm font-medium text-gray-800">
                  どこが難しかったですか？（任意）
                </label>
                <select id="feedback-reason" value={reason} onChange={(event) => setReason(event.target.value as FeedbackReason | "")}
                  className="mt-2 w-full max-w-md rounded-lg border border-gray-300 bg-white p-2 text-sm">
                  <option value="">選択しない</option>
                  {reasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            )}

            {(kind === "correction" || rating !== null) && (
              <div>
                <label htmlFor="feedback-note" className="block text-sm font-medium text-gray-800">
                  {kind === "correction" ? "誤りだと思う箇所と理由（8〜500文字）" : "感想・改善してほしい点（任意）"}
                </label>
                <textarea id="feedback-note" value={note} onChange={(event) => setNote(event.target.value)}
                  maxLength={500} rows={3} required={kind === "correction"} minLength={kind === "correction" ? 8 : undefined}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm"
                  placeholder={kind === "correction" ? "例：〇〇の説明に誤りがあるようです。出典では…" : "例：具体例をもう一つ知りたい"} />
                <p className="mt-1 text-xs text-gray-500">{note.length}/500文字</p>
              </div>
            )}

            <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              strategy="afterInteractive" onReady={renderChallenge} />
            <div ref={challengeContainer} aria-label="不正投稿防止の確認" />
            <button type="submit" disabled={!ready || sending}
              className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
              {sending ? "送信中…" : "フィードバックを送信"}
            </button>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          </form>
        )
      ) : (
        <p className="mt-3 text-sm text-gray-700">
          現在はお問い合わせフォームから、ご意見・分かりにくかった箇所・誤りのご指摘を受け付けています。
        </p>
      )}
      <p className="mt-4 text-xs leading-6 text-gray-600">
        記事名：{title}（{articleId || slug}）。
        <a href={CONTACT_FORM} target="_blank" rel="noopener noreferrer"
          className="ml-1 font-semibold text-blue-700 underline underline-offset-2">
          お問い合わせフォームから送る
        </a>
        <span className="ml-1">（外部サイト）</span>
      </p>
      <p className="mt-1 text-xs text-gray-500">
        <a href="/privacy" className="underline">個人情報の取り扱い</a>
      </p>
    </section>
  );
}
