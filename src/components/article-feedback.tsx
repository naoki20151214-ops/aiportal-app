"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import type { FeedbackKind, FeedbackRating, FeedbackReason } from "@/lib/article-feedback-schema";

// Live fallback until D1, Turnstile and rate limits have been provisioned.
const CONTACT_FORM = "https://docs.google.com/forms/d/e/1FAIpQLSdP1r0fWxEinCVDqNuMT2nKvCX__2epeWHoxUWc623oxKCAvQ/viewform";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const ENABLED = process.env.NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED === "1" && SITE_KEY.length > 0;

interface TurnstileBrowser {
  render(element: HTMLElement, options: {
    sitekey: string;
    action: string;
    appearance: "interaction-only";
    execution: "render";
    language: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
  }): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileBrowser;
  }
}

type PendingSubmission = {
  method: "POST" | "PATCH";
  requestId: string;
  kind: FeedbackKind;
  rating: FeedbackRating | null;
  reason: FeedbackReason | null;
  note: string;
};

const ratings: ReadonlyArray<{ value: FeedbackRating; label: string }> = [
  { value: "understood", label: "😊 わかった" },
  { value: "difficult", label: "🤔 まだ難しい" },
];
const reasons: ReadonlyArray<{ value: FeedbackReason; label: string }> = [
  { value: "jargon", label: "言葉が難しい" },
  { value: "need-examples", label: "具体例がほしい" },
  { value: "hard-visuals", label: "図が分かりにくい" },
  { value: "hard-text", label: "説明が飛ぶ" },
];

export default function ArticleFeedback({
  articleId, slug, revision, title,
}: {
  articleId?: string;
  slug: string;
  revision: string;
  title: string;
}) {
  const [near, setNear] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<"checking" | "ready" | "unavailable">(
    ENABLED ? "checking" : "unavailable"
  );
  const [busy, setBusy] = useState(false);
  const [savedVote, setSavedVote] = useState<FeedbackRating | null>(null);
  const [savedReason, setSavedReason] = useState<FeedbackReason | null>(null);
  const [editing, setEditing] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionNote, setCorrectionNote] = useState("");
  const [correctionSent, setCorrectionSent] = useState(false);
  const [error, setError] = useState("");
  const [pendingChoice, setPendingChoice] = useState<FeedbackRating | null>(null);

  const sectionRef = useRef<HTMLElement | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef("");
  const inFlightRef = useRef(false);
  const pendingRef = useRef<PendingSubmission | null>(null);
  const retryRef = useRef<PendingSubmission | null>(null);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voteIdRef = useRef<string | null>(null);
  const correctionIdRef = useRef<string | null>(null);

  // Every request is bound to a one-time Turnstile token, which the API
  // validates BEFORE persisting. A vote click queues exactly one submission;
  // the widget finishing later does not require a second tap.
  const flush = useCallback(() => {
    const pending = pendingRef.current;
    const token = tokenRef.current;
    if (!pending || !token || inFlightRef.current || !articleId) return;
    pendingRef.current = null;
    tokenRef.current = "";
    inFlightRef.current = true;
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    waitTimerRef.current = null;

    void (async () => {
      try {
        const response = await fetch("/api/feedback", {
          method: pending.method,
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            articleId, slug, revision,
            ...pending,
            turnstileToken: token,
          }),
          signal: AbortSignal.timeout(12000),
        });
        const result = await response.json() as { ok?: boolean; receipt?: string };
        if (!response.ok || result.ok !== true || result.receipt !== pending.requestId)
          throw new Error("Server did not confirm persistence");
        retryRef.current = null;
        setError("");
        if (pending.kind === "rating") {
          setSavedVote(pending.rating);
          setSavedReason(pending.reason);
          setEditing(false);
        } else {
          setCorrectionSent(true);
          setCorrectionOpen(false);
        }
      } catch {
        retryRef.current = pending; // reuse the same UUID; retry cannot double-count.
        setError("保存できませんでした。再試行するか、お問い合わせフォームをご利用ください。");
      } finally {
        inFlightRef.current = false;
        setBusy(false);
        setPendingChoice(null);
        const id = widgetIdRef.current;
        if (id) {
          try { window.turnstile?.reset(id); } catch { /* Retry is available. */ }
        }
      }
    })();
  }, [articleId, revision, slug]);

  const failPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    retryRef.current = pending;
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    waitTimerRef.current = null;
    setBusy(false);
    setPendingChoice(null);
    setError("安全確認が完了しませんでした。再試行するか、お問い合わせフォームをご利用ください。");
  }, []);

  const renderChallenge = useCallback(() => {
    if (!ENABLED || !articleId || !near || serviceStatus !== "ready" || !window.turnstile ||
        !widgetRef.current || widgetIdRef.current !== null) return;
    try {
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: SITE_KEY,
        action: "article_feedback",
        appearance: "interaction-only",
        execution: "render",
        language: "ja",
        callback: (token) => {
          tokenRef.current = token;
          flush();
        },
        "expired-callback": () => { tokenRef.current = ""; },
        "error-callback": () => {
          tokenRef.current = "";
          failPending();
        },
      });
    } catch {
      failPending();
    }
  }, [articleId, failPending, flush, near, serviceStatus]);

  // Do not load a third-party challenge while visitors are reading at the top
  // of a long article. Prewarm when the feedback panel approaches the viewport.
  useEffect(() => {
    if (!ENABLED || !articleId || !sectionRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setNear(true));
      return;
    }
    const observer = new IntersectionObserver((items) => {
      if (items.some((item) => item.isIntersecting)) {
        setNear(true);
        observer.disconnect();
      }
    }, { rootMargin: "800px 0px" });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [articleId]);

  // A cheap health check prevents presenting nonfunctional controls if
  // someone enables the public build flag before provisioning D1/migrations.
  useEffect(() => {
    if (!ENABLED || !articleId || !near) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/feedback", {
          method: "GET", cache: "no-store", credentials: "same-origin",
          signal: controller.signal,
        });
        const data = await response.json() as { ok?: boolean; available?: boolean };
        if (!controller.signal.aborted) {
          setServiceStatus(response.ok && data.ok && data.available ? "ready" : "unavailable");
        }
      } catch {
        if (!controller.signal.aborted) setServiceStatus("unavailable");
      }
    })();
    return () => controller.abort();
  }, [articleId, near]);

  useEffect(() => {
    if (near && serviceStatus === "ready") renderChallenge();
  }, [near, renderChallenge, serviceStatus]);

  useEffect(() => () => {
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    if (widgetIdRef.current) {
      try { window.turnstile?.remove(widgetIdRef.current); } catch { /* Cleanup only. */ }
    }
  }, []);

  function enqueue(job: PendingSubmission) {
    if (!ENABLED || !articleId || pendingRef.current || inFlightRef.current) return;
    pendingRef.current = job;
    retryRef.current = null;
    setError("");
    setBusy(true);
    waitTimerRef.current = setTimeout(failPending, 15000);
    if (tokenRef.current) {
      flush();
    } else if (!widgetIdRef.current) {
      // The script may still be loading. OnReady → render → callback → flush.
      setNear(true);
    }
    // An existing Turnstile widget uses execution:"render" and is already
    // preparing a single-use token (also after reset). Do not double-execute.
  }

  function choose(rating: FeedbackRating) {
    if (busy || !articleId) return;
    const id = voteIdRef.current || crypto.randomUUID();
    voteIdRef.current = id;
    setPendingChoice(rating);
    enqueue({
      kind: "rating",
      method: savedVote === null ? "POST" : "PATCH",
      requestId: id,
      rating,
      reason: null,
      note: "",
    });
  }

  function chooseReason(reason: FeedbackReason) {
    if (busy || savedVote !== "difficult" || !voteIdRef.current || savedReason === reason) return;
    enqueue({
      kind: "rating",
      method: "PATCH",
      requestId: voteIdRef.current,
      rating: "difficult",
      reason,
      note: "",
    });
  }

  function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !articleId || correctionSent || correctionNote.trim().length < 8) return;
    const id = correctionIdRef.current || crypto.randomUUID();
    correctionIdRef.current = id;
    enqueue({
      method: "POST",
      requestId: id,
      kind: "correction",
      rating: null,
      reason: null,
      note: correctionNote.trim(),
    });
  }

  return (
    <section ref={sectionRef} data-feedback-widget="one-tap" className="mt-10 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:p-6" aria-label="記事へのフィードバック">
      <h2 className="text-base font-bold text-gray-900 sm:text-lg">この記事の説明、分かりやすかった？</h2>
      <p className="mt-1 text-sm leading-6 text-gray-600">あなたの声で、次の記事がもっと分かりやすくなります。</p>
      {ENABLED && articleId && serviceStatus === "ready" ? (
        <>
          {savedVote !== null && !editing ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2" role="status">
              <span className="text-sm font-semibold text-green-800">✓ ありがとう！回答を受け付けました。</span>
              <button type="button" disabled={busy} onClick={() => { setEditing(true); setError(""); }}
                className="min-h-11 rounded-md px-2 text-sm font-medium text-blue-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                回答を変更する
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="この記事の理解度">
              {ratings.map((option) => (
                <button key={option.value} type="button" disabled={busy}
                  aria-pressed={pendingChoice === option.value || (editing && savedVote === option.value)}
                  onClick={() => choose(option.value)}
                  className={"min-h-12 rounded-lg border px-2 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60 sm:text-base " +
                    (pendingChoice === option.value || (editing && savedVote === option.value)
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-gray-300 bg-white text-gray-800 hover:border-blue-600 hover:bg-blue-50")}>
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {savedVote === "difficult" && !editing && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700">どこが難しかった？ <span className="font-normal text-gray-500">（任意）</span></p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="難しかった理由">
                {reasons.map((item) => (
                  <button type="button" key={item.value} disabled={busy}
                    aria-pressed={savedReason === item.value}
                    onClick={() => chooseReason(item.value)}
                    className={"min-h-11 rounded-full border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60 " +
                      (savedReason === item.value
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-blue-600")}>
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">理由もタップだけで保存できます。答えなくても大丈夫です。</p>
            </div>
          )}
          <div className="mt-4 min-h-6" aria-live="polite" aria-atomic="true">
            {busy && <p className="text-sm font-medium text-blue-800">安全確認と送信をしています…</p>}
            {error && (
              <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-700">
                <span>{error}</span>
                {retryRef.current && (
                  <button type="button" onClick={() => { if (retryRef.current) enqueue(retryRef.current); }}
                    className="min-h-11 rounded-lg border border-red-300 bg-white px-3 font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
                    再試行
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 border-t border-blue-100 pt-3">
            {correctionSent ? (
              <p role="status" className="text-sm font-medium text-green-800">✓ 誤りのご報告も受け付けました。ありがとうございます。</p>
            ) : (
              <>
                <button type="button" aria-expanded={correctionOpen} aria-controls="article-correction-form"
                  onClick={() => { setCorrectionOpen(!correctionOpen); setError(""); }}
                  className="min-h-11 text-sm font-medium text-blue-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                  内容の誤りを報告する
                </button>
                {correctionOpen && (
                  <form id="article-correction-form" onSubmit={submitCorrection} className="mt-2 space-y-3">
                    <label htmlFor="article-correction-note" className="block text-sm font-medium text-gray-700">
                      誤りだと思う箇所を教えてください（8〜500文字）
                    </label>
                    <textarea id="article-correction-note" rows={3} maxLength={500} minLength={8}
                      required value={correctionNote}
                      onChange={event => setCorrectionNote(event.target.value)}
                      placeholder="例：『〇〇』の説明は、出典と異なるようです。"
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-700" />
                    <p className="text-xs text-gray-500">記事名と記事IDは自動で付きます。名前やメールアドレスは不要です。</p>
                    <button type="submit" disabled={busy || correctionNote.trim().length < 8}
                      className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50">
                      誤りを送信する
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
          {near && (
            <>
              <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                strategy="afterInteractive" onReady={renderChallenge}
                onError={() => { failPending(); setServiceStatus("unavailable"); }} />
              <div ref={widgetRef} aria-label="不正投稿防止の確認" />
            </>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-700">
          {ENABLED && serviceStatus === "checking"
            ? "1タップ評価の接続を確認しています。"
            : "1タップ評価の保存機能を準備しています。今はお問い合わせフォームからご意見や誤りをお寄せいただけます。"}

        </p>
      )}
      <div className="mt-3 border-t border-blue-100 pt-3 text-xs leading-6 text-gray-600">
        <span>対象記事：{title}（{articleId || slug}）</span>
        <a href={CONTACT_FORM} target="_blank" rel="noopener noreferrer"
          className="ml-2 font-semibold text-blue-700 underline underline-offset-2">
          お問い合わせフォームから送る
        </a>
        <span className="ml-1">（外部サイト）</span>
        <a href="/privacy" className="ml-2 underline">個人情報の取り扱い</a>
      </div>
    </section>
  );
}
